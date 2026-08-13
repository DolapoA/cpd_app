import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Log in — CPD Register" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { reset } = await searchParams;

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <h1>Log in</h1>
      </div>
      {reset === "1" && (
        <div className="notice notice--ok">
          <p className="small">
            Your password has been changed. Sign in with the new one.
          </p>
        </div>
      )}

      <div className="card">
        <ActionForm action={login} submitLabel="Log in">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
        </ActionForm>
      </div>
      <p className="muted small">
        New here? <Link href="/signup">Create a free account</Link>.
      </p>
      <p className="muted small">
        <Link href="/reset">Forgotten your password?</Link>
      </p>
    </main>
  );
}
