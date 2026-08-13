import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  changePassword,
  deleteAccount,
  revokeOtherSessions,
  setBackupEmail,
} from "@/lib/actions";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Account — CPD Register" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const sessions = (
    db.prepare("SELECT COUNT(*) AS c FROM sessions WHERE user_id = ?").get(user.id) as { c: number }
  ).c;
  const entries = (
    db.prepare("SELECT COUNT(*) AS c FROM cpd_entries WHERE user_id = ?").get(user.id) as {
      c: number;
    }
  ).c;
  const signatures = (
    db.prepare("SELECT COUNT(*) AS c FROM signatures WHERE user_id = ?").get(user.id) as {
      c: number;
    }
  ).c;
  const registers = (
    db.prepare("SELECT COUNT(*) AS c FROM registers WHERE organiser_id = ?").get(user.id) as {
      c: number;
    }
  ).c;

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>
            Sign-in, security and your data. Your professional details are on{" "}
            <Link href="/profile">your profile</Link>.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Email</h2>
        <p className="muted small">
          You sign in with <strong>{user.email}</strong>. Joined {formatDate(user.created_at.slice(0, 10))}.
        </p>
        <ActionForm action={setBackupEmail} submitLabel="Save backup email">
          <div className="field">
            <label htmlFor="backup_email">Backup email</label>
            <input
              id="backup_email"
              name="backup_email"
              type="email"
              defaultValue={user.backup_email ?? ""}
              placeholder="e.g. your personal address"
              autoComplete="email"
            />
            <div className="hint">
              A second address to reach you on if you lose access to the first — useful if you sign
              in with a work address you might one day leave. Clear the box to remove it.
            </div>
          </div>
        </ActionForm>
        <p className="hint">
          It is kept as a contact address only. Attendance slips are still matched to{" "}
          <strong>{user.email}</strong>, because confirming ownership of a second address needs
          email we don&rsquo;t send yet — and until it is confirmed, matching slips to it would let
          anyone claim attendance by typing someone else&rsquo;s address.
        </p>
      </div>

      <div className="card">
        <h2>Password</h2>
        <ActionForm action={changePassword} submitLabel="Change password">
          <div className="field">
            <label htmlFor="current_password">Current password</label>
            <input
              id="current_password"
              name="current_password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label htmlFor="new_password">New password</label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <div className="hint">At least 8 characters.</div>
          </div>
          <div className="field">
            <label htmlFor="confirm_password">Confirm new password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </ActionForm>
        <p className="hint">
          Changing it signs you out everywhere else, which is the point of changing it if someone
          else has been signed in.
        </p>
      </div>

      <div className="card">
        <h2>Where you&rsquo;re signed in</h2>
        <p className="muted small">
          {sessions === 1
            ? "This device is the only one signed in."
            : `${sessions} devices are signed in, including this one.`}
        </p>
        {sessions > 1 && (
          <form action={revokeOtherSessions}>
            <button type="submit" className="btn btn--secondary">
              Sign out everywhere else
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Your data</h2>
        <p className="muted small">
          Everything this account holds: your details, {entries} record{" "}
          {entries === 1 ? "entry" : "entries"}, and {signatures}{" "}
          {signatures === 1 ? "attendance" : "attendances"} — as a JSON file you can keep or move
          elsewhere.
        </p>
        <div className="actions-row">
          <a href="/account/export" className="btn btn--secondary">
            Download my data (JSON)
          </a>
          <Link href="/record/export" className="btn btn--quiet">
            CPD record only (CSV)
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Close this account</h2>
        <p className="small">
          This cannot be undone. Before you do, here is exactly what happens — because
          &ldquo;delete everything&rdquo; would not be true.
        </p>
        <dl className="gap-reasons">
          <div>
            <dt>Deleted outright</dt>
            <dd>
              Your profile and sign-in, and all {entries} of your CPD record{" "}
              {entries === 1 ? "entry" : "entries"}. Download your data first if you want to keep
              it.
            </dd>
          </div>
          <div>
            <dt>Your name removed, the record kept</dt>
            <dd>
              {signatures === 0
                ? "Any register you sign in future would be affected this way."
                : `Your ${signatures} ${signatures === 1 ? "attendance" : "attendances"} on other people’s registers.`}{" "}
              The attendance itself stays so the organiser&rsquo;s register is still accurate and
              any slip an auditor already holds still verifies — but it will no longer name you.
            </dd>
          </div>
          {registers > 0 && (
            <div>
              <dt>Kept, and closed</dt>
              <dd>
                The {registers} {registers === 1 ? "register" : "registers"} you organise. They are
                other attendees&rsquo; evidence, so they stay, with your name on them as organiser
                — it is printed on slips already issued and shown on the public verification page.
                Any still open will be closed.
              </dd>
            </div>
          )}
        </dl>
        <ActionForm
          action={deleteAccount}
          submitLabel="Permanently close my account"
          submitTone="danger"
        >
          <div className="field">
            <label htmlFor="delete_password">Your password</label>
            <input
              id="delete_password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label htmlFor="confirm">Type DELETE to confirm</label>
            <input id="confirm" name="confirm" type="text" required autoComplete="off" />
          </div>
        </ActionForm>
      </div>
    </main>
  );
}
