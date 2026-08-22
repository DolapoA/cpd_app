import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isOrganiserPlan } from "@/lib/entitlements";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { unusedRecoveryCount } from "@/lib/totp";
import {
  beginTwoFactor,
  changePassword,
  requestEmailChange,
  disableTwoFactor,
  deleteAccount,
  revokeOtherSessions,
  sendVerificationEmail,
  setBackupEmail,
  setOrganiserPlan,
} from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { JunkMailHint } from "@/components/junk-mail-hint";

export const metadata = { title: "Account — CPD Register" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; change?: string; recovery?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { sent, change, recovery } = await searchParams;

  const db = await getDb();
  // Four tallies of the same person, asked for at once. As four statements
  // they were four network round trips one after another, each waiting on the
  // last for no reason — none of them needs any of the others' answers.
  const [counts, recoveryCodes] = await Promise.all([
    db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM sessions    WHERE user_id = ?)      AS sessions,
           (SELECT COUNT(*) FROM cpd_entries WHERE user_id = ?)      AS entries,
           (SELECT COUNT(*) FROM signatures  WHERE user_id = ?)      AS signatures,
           (SELECT COUNT(*) FROM registers   WHERE organiser_id = ?) AS registers`
      )
      .get(user.id, user.id, user.id, user.id) as Promise<{
      sessions: string;
      entries: string;
      signatures: string;
      registers: string;
    }>,
    user.totp_confirmed_at ? unusedRecoveryCount(user.id) : Promise.resolve(0),
  ]);
  // COUNT() is bigint, which node-postgres hands back as a string rather than
  // silently losing precision.
  const sessions = Number(counts.sessions);
  const entries = Number(counts.entries);
  const signatures = Number(counts.signatures);
  const registers = Number(counts.registers);

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>
            Sign-in, security and your data. Your professional details are on{" "}
            <Link href="/profile">your profile</Link>, and the longer explanations are in{" "}
            <Link href="/faq">questions and answers</Link>.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Email</h2>
        <p className="muted small">
          You sign in with <strong>{user.email}</strong>. Joined{" "}
          {formatDate(user.created_at.slice(0, 10))}.{" "}
          {user.email_verified_at ? (
            <span className="badge badge--verified">Confirmed</span>
          ) : (
            <span className="badge badge--pending">Not confirmed</span>
          )}
        </p>
        {!user.email_verified_at && (
          <div className={`notice notice--${sent === "1" ? "ok" : "warn"}`}>
            {sent === "1" ? (
              <p className="small">
                <strong>Link sent to {user.email}.</strong> It works for 24 hours.
              </p>
            ) : sent === "failed" ? (
              <p className="small">
                <strong>That didn&rsquo;t send.</strong> The address may be wrong, or our email
                provider may be having trouble. Try again in a few minutes.
              </p>
            ) : (
              <p className="small">
                Confirm this address so attendance you sign as a guest is matched to it
                automatically. Until it is confirmed we only match slips signed while you were
                logged in.
              </p>
            )}
            {sent === "1" && (
              <JunkMailHint>
                Worth checking the address above is spelled correctly too — a link sent to an
                address that doesn&rsquo;t exist simply vanishes.
              </JunkMailHint>
            )}
            <form action={sendVerificationEmail}>
              <button type="submit" className="btn btn--secondary btn--small">
                {sent === "1" ? "Send it again" : "Send me the link"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Change your email</h2>
        {change === "sent" ? (
          <div className="notice notice--ok">
            <p className="small">
              <strong>Confirmation link sent.</strong> Open it from the new address and the
              change takes effect. Until then you carry on signing in with{" "}
              <strong>{user.email}</strong> — so a typo costs you nothing but another go.
            </p>
            <JunkMailHint />
          </div>
        ) : change === "failed" ? (
          <div className="notice notice--warn">
            <p className="small">
              <strong>That didn&rsquo;t send.</strong> Check the address and try again in a few
              minutes. Nothing has changed.
            </p>
          </div>
        ) : (
          <p className="muted small">
            You sign in with this address, and reset links go to it.
          </p>
        )}
        <ActionForm action={requestEmailChange} submitLabel="Send confirmation link">
          <div className="field">
            <label htmlFor="new_email">New email address</label>
            <input id="new_email" name="new_email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="change_password">Your password</label>
            <input
              id="change_password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <div className="hint">
              This is where sign-in and reset links go, so changing it asks for your password.
            </div>
          </div>
        </ActionForm>
      </div>

      <div className="card">
        <h2>Recovery email</h2>
        {user.backup_email && (
          <p className="muted small">
            <strong>{user.backup_email}</strong>{" "}
            {user.backup_email_verified_at ? (
              <span className="badge badge--verified">Confirmed</span>
            ) : (
              <span className="badge badge--pending">Not confirmed</span>
            )}
          </p>
        )}
        {recovery === "sent" ? (
          <div className="notice notice--ok">
            <p className="small">
              <strong>Confirmation link sent.</strong> Open it from that address to finish. Until
              you do, it can&rsquo;t be used to reset your password.
            </p>
            <JunkMailHint />
          </div>
        ) : recovery === "failed" ? (
          <div className="notice notice--warn">
            <p className="small">
              <strong>That didn&rsquo;t send.</strong> The address is saved but unconfirmed —
              check the spelling and save it again to get another link.
            </p>
          </div>
        ) : user.backup_email && !user.backup_email_verified_at ? (
          <div className="notice notice--warn">
            <p className="small">
              Confirm this address and it becomes your way back in if you lose access to{" "}
              <strong>{user.email}</strong>. Unconfirmed, it does nothing. Save it again below to
              get another link.
            </p>
          </div>
        ) : (
          <p className="muted small">
            A second address you can reset your password from.
          </p>
        )}
        <ActionForm action={setBackupEmail} submitLabel="Save recovery email">
          <div className="field">
            <label htmlFor="backup_email">Recovery email</label>
            <input
              id="backup_email"
              name="backup_email"
              type="email"
              defaultValue={user.backup_email ?? ""}
              placeholder="e.g. your personal address"
              autoComplete="email"
            />
            <div className="hint">
              We&rsquo;ll email it a link to confirm. Clear the box to remove it.
            </div>
          </div>
        </ActionForm>
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
          Changing it signs you out everywhere else.
        </p>
      </div>

      <div className="card">
        <h2>Two-factor authentication</h2>
        {user.totp_confirmed_at ? (
          <>
            <p className="muted small">
              <span className="badge badge--verified">On</span> You are asked for a code from your
              authenticator app each time you sign in. You have{" "}
              <strong>{recoveryCodes}</strong> unused recovery{" "}
              {recoveryCodes === 1 ? "code" : "codes"}.
            </p>
            {recoveryCodes === 0 && (
              <p className="hint">
                With no recovery codes left, losing your phone means losing access to this
                account. Generate a new set.
              </p>
            )}
            <Link href="/account/two-factor" className="btn btn--secondary">
              Manage
            </Link>
            <ActionForm action={disableTwoFactor} submitLabel="Turn off" submitTone="danger">
              <div className="field">
                <label htmlFor="disable_2fa_password">
                  Confirm your password to turn it off
                </label>
                <input
                  id="disable_2fa_password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </ActionForm>
          </>
        ) : (
          <>
            <p className="muted small">
              A six-digit code from your phone, on top of your password.
            </p>
            <form action={beginTwoFactor}>
              <button type="submit" className="btn btn--secondary">
                Set up two-factor authentication
              </button>
            </form>
          </>
        )}
      </div>

      {/* Free while there is nothing to pay: the organiser features are
          finished, so the only thing standing between somebody and them is a
          decision. When billing exists this card becomes the checkout, and
          the column it sets does not change. */}
      <div className="card">
        <div className="page-head page-head--tight">
          <h2>Running events</h2>
          {isOrganiserPlan(user) && <span className="badge badge--official">Organiser</span>}
        </div>
        {isOrganiserPlan(user) ? (
          <>
            <p className="muted small">
              Your logo on sign-in pages and slips, extra sign-in questions, feedback trends
              across your events, and a threshold before feedback opens.
            </p>
            <div className="actions-row">
              <Link href="/registers" className="btn btn--secondary">
                Your registers
              </Link>
              <form action={setOrganiserPlan}>
                <input type="hidden" name="plan" value="free" />
                <button type="submit" className="btn btn--quiet">
                  Turn these off
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="muted small">
              For people who run events regularly: your logo on sign-in pages and slips, extra
              sign-in questions, feedback trends across your events, and a threshold before
              feedback opens. Free while we are testing, and reversible.
            </p>
            <form action={setOrganiserPlan}>
              <input type="hidden" name="plan" value="organiser" />
              <button type="submit" className="btn">
                Turn on organiser features
              </button>
            </form>
          </>
        )}
      </div>

      <div className="card">
        <div className="page-head page-head--tight">
          <h2>Notifications</h2>
          <Link href="/account/notifications" className="btn btn--quiet btn--small">
            Set them up
          </Link>
        </div>
        <p className="muted small">
          Reminders on your phone. Needs the app installed.
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
            <label htmlFor="delete_confirmation">Type DELETE to confirm</label>
            {/* Sitting beside a password input, a plain text field reads to a
                password manager as the username and gets filled with an email
                address — which then fails the check for reasons the user
                cannot see. autoComplete="off" alone is widely ignored, so the
                major managers are each told explicitly to leave it alone. */}
            <input
              id="delete_confirmation"
              name="confirm"
              type="text"
              required
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              data-form-type="other"
            />
          </div>
        </ActionForm>
      </div>
    </main>
  );
}
