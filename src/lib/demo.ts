import "server-only";
import { getDb, type Register } from "./db";

/**
 * The demo register on the home page.
 *
 * The loop — sign as a guest, get a slip, verify the code — is the best
 * demonstration the product has, and until now nobody saw it without first
 * creating an account and a register of their own. So the home page carries
 * a register anyone can sign, and it is a real one: an ordinary row, an
 * ordinary signature, a real slip and a real code. Nothing is mocked, which
 * is the point.
 *
 * One per day rather than one forever. A register that opens and closes
 * around its event is the product's own claim about why its slips stand up,
 * and a demo that was open since March would quietly contradict it. A fresh
 * one each day also means the "already signed" check only bites within the
 * day, and yesterday's slips keep yesterday's date.
 *
 * Three things keep it honest as data:
 *   - the code prefix marks it, so the verify page can say what it was;
 *   - signing up from a demo slip does not claim it onto the new record,
 *     since a verified entry cannot be deleted and a fake one must not be
 *     permanent;
 *   - the signatures are purged after a week. They carry real names and
 *     addresses typed in to see what happens, which is not a reason to keep
 *     them.
 */
export const DEMO_CODE_PREFIX = "DEMO-";
export const DEMO_KEEP_DAYS = 7;

export function isDemoRegister(reg: Pick<Register, "code">): boolean {
  return reg.code.startsWith(DEMO_CODE_PREFIX);
}

/** Today in the UK, YYYY-MM-DD — the day the visitor is having. */
function ukToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function demoCodeFor(date: string): string {
  return `${DEMO_CODE_PREFIX}${date.replace(/-/g, "")}`;
}

/** Today's demo register, created on first sight. Safe to call on every visit. */
export async function ensureDemoRegister(): Promise<Register> {
  const db = await getDb();
  const date = ukToday();
  const code = demoCodeFor(date);

  const existing = (await db.prepare("SELECT * FROM registers WHERE code = ?").get(code)) as
    | Register
    | undefined;
  if (existing) return existing;

  // Open a little either side of the UK day, in UTC. The status check compares
  // ISO strings, and a register that opened at midnight UTC would tell someone
  // at half past midnight in July that the event has not started.
  await db
    .prepare(
      `INSERT INTO registers
         (code, organiser_id, organiser_name, title, description, event_date, start_time, end_time,
          location, event_type, is_official, opens_at, closes_at, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, '00:00', '23:59', ?, 'Other', 0, ?, ?, ?)
       ON CONFLICT (code) DO NOTHING`
    )
    .run(
      code,
      "CPD Register",
      "Demo: try signing a register",
      "A demonstration register from the cpdregister.app home page. The slip and its verification code are real; the event is not.",
      date,
      "Online",
      `${shiftDays(date, -1)}T22:00:00.000Z`,
      `${shiftDays(date, 1)}T02:00:00.000Z`,
      new Date().toISOString()
    );

  return (await db.prepare("SELECT * FROM registers WHERE code = ?").get(code)) as Register;
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
