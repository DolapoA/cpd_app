import Link from "next/link";
import { getDb } from "@/lib/db";
import { claimToken } from "@/lib/tokens";

export const metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claimed = await claimToken(token, "verify");

  if (claimed) {
    const db = await getDb();
    await db
      .prepare("UPDATE users SET email_verified_at = ? WHERE id = ?")
      .run(new Date().toISOString(), claimed.user_id);
  }

  return (
    <main className="container container--narrow stack">
      <div className={`card empty${claimed ? "" : ""}`}>
        <div className="empty__icon" aria-hidden="true">{claimed ? "✓" : "◌"}</div>
        <p className="empty__title">{claimed ? "Email confirmed" : "That link didn’t work"}</p>
        <p>
          {claimed
            ? "Thanks — attendance you sign at events can now be matched to this address automatically."
            : "The link has expired or has already been used. You can send yourself another from your account page."}
        </p>
        <div className="actions-row">
          <Link href={claimed ? "/dashboard" : "/account"} className="btn">
            {claimed ? "Go to dashboard" : "Go to my account"}
          </Link>
        </div>
      </div>
    </main>
  );
}
