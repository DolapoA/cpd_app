import Link from "next/link";
import { applyEmailChange } from "@/lib/actions";

export const metadata = { title: "Confirm your new email" };

export default async function ChangeEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await applyEmailChange(token);

  return (
    <main className="container container--narrow stack">
      <div className="card empty">
        <div className="empty__icon" aria-hidden="true">{result.ok ? "✓" : "◌"}</div>
        <p className="empty__title">
          {result.ok
            ? "Email changed"
            : result.reason === "taken"
              ? "That address has been taken"
              : "That link didn’t work"}
        </p>
        <p>
          {result.ok ? (
            <>
              You now sign in with <strong>{result.email}</strong>, and it is already confirmed —
              attendance you sign at events will be matched to it. Anywhere else you were signed
              in has been signed out.
            </>
          ) : result.reason === "taken" ? (
            <>
              Somebody else registered that address between the link being sent and you opening
              it. Your account is unchanged. Try again with a different address.
            </>
          ) : (
            <>
              The link has expired or has already been used. Your account is unchanged — start
              again from your account page.
            </>
          )}
        </p>
        <div className="actions-row">
          <Link href={result.ok ? "/dashboard" : "/account"} className="btn">
            {result.ok ? "Go to dashboard" : "Go to my account"}
          </Link>
        </div>
      </div>
    </main>
  );
}
