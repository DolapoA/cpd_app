import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { requestPasswordReset } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Reset your password" };

export default async function ResetRequestPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Reset your password</h1>
          <p>We&rsquo;ll email you a link to set a new one.</p>
        </div>
      </div>
      <div className="card">
        <ActionForm action={requestPasswordReset} submitLabel="Email me a link">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" autoFocus />
            <div className="hint">
              The address you sign in with, or the backup address on your account.
            </div>
          </div>
        </ActionForm>
      </div>
      <p className="muted small">
        Remembered it? <Link href="/login">Log in</Link>.
      </p>
    </main>
  );
}
