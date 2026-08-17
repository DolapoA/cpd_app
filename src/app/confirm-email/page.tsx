import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/actions";

export const metadata = { title: "Confirm your email — CPD Register" };

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Nothing to do here once it is confirmed, and landing on this page then
  // would read as though something had gone wrong.
  if (user.email_verified_at) redirect("/dashboard");

  const sent = (await searchParams).sent;

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Confirm your email to continue</h1>
          <p>
            We sent a link to <strong>{user.email}</strong> when you signed up. Opening it is the
            last step.
          </p>
        </div>
      </div>

      <div className={`notice notice--${sent === "1" ? "ok" : "info"}`}>
        {sent === "1" ? (
          <p className="small">
            <strong>Sent again to {user.email}.</strong> Give it a minute, and check your spam
            folder.
          </p>
        ) : (
          <p className="small">
            Your CPD record is evidence you may need years from now, and attendance you sign at
            events is matched to this address. Both depend on it being an address you actually
            hold — which is why we ask before you start putting anything in.
          </p>
        )}
        <form action={sendVerificationEmail}>
          <input type="hidden" name="from" value="confirm" />
          <button type="submit" className="btn">
            {sent === "1" ? "Send it once more" : "Send the link again"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Nothing arriving?</h2>
        <p className="muted small">
          Check the address above is spelled correctly — a link sent to an address that
          doesn&rsquo;t exist vanishes without a bounce. You can change it on your account page,
          and the new address gets the link instead.
        </p>
        <Link href="/account" className="btn btn--secondary">
          Check or change my email
        </Link>
      </div>
    </main>
  );
}
