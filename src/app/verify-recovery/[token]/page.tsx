import Link from "next/link";
import { applyRecoveryConfirmation } from "@/lib/actions";

export const metadata = { title: "Confirm your recovery address" };

export default async function VerifyRecoveryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const confirmed = await applyRecoveryConfirmation(token);

  return (
    <main className="container container--narrow stack">
      <div className="card empty">
        <div className="empty__icon" aria-hidden="true">{confirmed ? "✓" : "◌"}</div>
        <p className="empty__title">
          {confirmed ? "Recovery address confirmed" : "That link didn’t work"}
        </p>
        <p>
          {confirmed
            ? "If you ever lose access to the address you sign in with, you can reset your password from this one instead."
            : "The link has expired, has already been used, or the account’s recovery address has changed since it was sent. You can send yourself another from your account page."}
        </p>
        <div className="actions-row">
          <Link href="/account" className="btn">
            Go to my account
          </Link>
        </div>
      </div>
    </main>
  );
}
