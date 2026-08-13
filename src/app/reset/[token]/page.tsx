import Link from "next/link";
import { resetPassword } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Set a new password" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Set a new password</h1>
          <p>Choosing a new one signs you out on every device.</p>
        </div>
      </div>
      <div className="card">
        <ActionForm action={resetPassword} submitLabel="Save new password">
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
            <div className="hint">At least 8 characters.</div>
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </ActionForm>
      </div>
      <p className="muted small">
        Link expired? <Link href="/reset">Request another</Link>.
      </p>
    </main>
  );
}
