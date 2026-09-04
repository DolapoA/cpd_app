import "server-only";
import { getDb, type Register } from "./db";

/**
 * The demo registers the home page used to carry, and what is still owed to
 * them.
 *
 * For a while the home page offered a register anyone could sign — a real
 * row, a real slip, a fresh one each day — before the guest development plan
 * took its place. The rows it made still exist for a week, and two promises
 * about them still hold: signing up from a demo slip never claims it onto a
 * record (a verified entry cannot be deleted, and a fake one must not be
 * permanent), and the signatures are purged after a week, since they carry
 * real names and addresses typed in to see what happened.
 */
export const DEMO_CODE_PREFIX = "DEMO-";
export const DEMO_KEEP_DAYS = 7;

export function isDemoRegister(reg: Pick<Register, "code">): boolean {
  return reg.code.startsWith(DEMO_CODE_PREFIX);
}

/** Today in the UK, YYYY-MM-DD. */
function ukToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Forgets demo signatures older than a week, and the registers once empty.
 * Only unclaimed signatures — none should ever be claimed, but a purge that
 * could break a foreign key from somebody's record is the wrong purge.
 */
export async function purgeDemoData(): Promise<{ signatures: number; registers: number }> {
  const db = await getDb();
  const cutoff = shiftDays(ukToday(), -DEMO_KEEP_DAYS);
  const signatures = await db
    .prepare(
      `DELETE FROM signatures
        WHERE user_id IS NULL
          AND register_id IN (SELECT id FROM registers WHERE code LIKE 'DEMO-%' AND event_date < ?)`
    )
    .run(cutoff);
  const registers = await db
    .prepare(
      `DELETE FROM registers
        WHERE code LIKE 'DEMO-%' AND event_date < ?
          AND NOT EXISTS (SELECT 1 FROM signatures s WHERE s.register_id = registers.id)`
    )
    .run(cutoff);
  return { signatures: signatures.changes, registers: registers.changes };
}
