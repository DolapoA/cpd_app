import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, registerStatus, type Register } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { signRegister } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Sign the attendance register — CPD Register" };

export default async function PublicSignPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const reg = await (await getDb())
    .prepare("SELECT * FROM registers WHERE code = ?").get(code) as
    | Register
    | undefined;
  if (!reg) notFound();

  const user = await getCurrentUser();
  const status = registerStatus(reg);
  const alreadySigned = user
    ? await (await getDb())
    .prepare("SELECT id FROM signatures WHERE register_id = ? AND email = ? AND voided = 0")
        .get(reg.id, user.email)
    : null;

  return (
    <main className="container container--narrow stack">
      <div className="card">
        <h1>{reg.title}</h1>
        <p className="muted">
          {formatDate(reg.event_date)} · {reg.start_time}–{reg.end_time}
          {reg.location ? ` · ${reg.location}` : ""}
          <br />
          Organised by {reg.organiser_name}
        </p>
        <p>
          {reg.is_official ? (
            <span className="badge badge--official">
              Official CPD · {reg.points} points ({reg.accrediting_body})
            </span>
          ) : (
            <span className="badge badge--nonofficial">Unofficial CPD activity</span>
          )}
        </p>
        {reg.description && <p className="muted small">{reg.description}</p>}
      </div>

      {status !== "open" ? (
        <div className="card">
          <p className="form-error">
            {status === "not-open"
              ? "This register isn’t open yet — it opens when the event starts."
              : "This register has closed and can no longer be signed."}
          </p>
        </div>
      ) : alreadySigned ? (
        <div className="card">
          <p>
            You&rsquo;ve already signed this register. The entry is in{" "}
            <Link href="/record">your CPD record</Link>.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Sign the register</h2>
          {user ? (
            <p className="muted small">
              Signing as <strong>{user.full_name}</strong> ({user.email}). It&rsquo;ll be added
              to your CPD record automatically.
            </p>
          ) : (
            <p className="muted small">
              No account needed — enter your details and download your slip. Or{" "}
              <Link href="/login">log in</Link> to have it saved to your record.
            </p>
          )}
          <ActionForm action={signRegister} submitLabel="Sign register" largeSubmit>
            <input type="hidden" name="register_code" value={reg.code} />
            {!user && (
              <>
                <div className="field">
                  <label htmlFor="full_name">Full name</label>
                  <input id="full_name" name="full_name" type="text" required autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required autoComplete="email" />
                  <div className="hint">Your attendance slip is linked to this address.</div>
                </div>
              </>
            )}
            {reg.access_code && (
              <div className="field">
                <label htmlFor="access_code">Access code</label>
                {/* A one-time code announced in a room; nothing a password
                    manager holds could ever be the right value. */}
                <input
                  id="access_code"
                  name="access_code"
                  type="text"
                  required
                  maxLength={12}
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore
                  data-form-type="other"
                />
                <div className="hint">Announced in the room by the organiser.</div>
              </div>
            )}
          </ActionForm>
        </div>
      )}
    </main>
  );
}
