import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { completeTwoFactor } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { CodeField } from "@/components/code-field";

export const metadata = { title: "Enter your code — CPD Register" };

export default async function TwoFactorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  // Reaching this page without a half-finished sign-in means the password step
  // was skipped, so there is nothing to complete.
  if (!(await cookies()).get("cpd_2fa_pending")) redirect("/login");

  const recovery = (await searchParams).recovery === "1";

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <h1>{recovery ? "Use a recovery code" : "Enter your code"}</h1>
      </div>

      <div className="card">
        <p className="muted small">
          {recovery
            ? "One of the codes you saved when you set this up. Each works once."
            : "Open your authenticator app and enter the six-digit code for CPD Register."}
        </p>
        <ActionForm action={completeTwoFactor} submitLabel="Continue">
          <input type="hidden" name="mode" value={recovery ? "recovery" : "totp"} />
          <CodeField
            label={recovery ? "Recovery code" : "Six-digit code"}
            recovery={recovery}
          />
        </ActionForm>
      </div>

      <p className="muted small">
        {recovery ? (
          <Link href="/login/two-factor">Use your authenticator app instead</Link>
        ) : (
          <Link href="/login/two-factor?recovery=1">Lost your phone? Use a recovery code</Link>
        )}
      </p>
      <p className="muted small">
        <Link href="/login">Start again</Link>
      </p>
    </main>
  );
}
