import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GuestPlan } from "@/components/guest-plan";

/**
 * A development plan, before an account.
 *
 * The one thing on the site a visitor can do that produces something of
 * theirs — five questions per goal, kept in their browser, and an account to
 * keep it in offered only once there is something to keep. Public and
 * indexable: "write a personal development plan" is a thing people search
 * for, and this is an honest answer to it.
 */
export const metadata = {
  title: "Write a personal development plan — free, no account needed",
  description:
    "Write the development goals your appraisal will ask about — the need, what you'll do, how you'll show it worked, and a target date. No account needed; keep it with one when you're done.",
  alternates: { canonical: "/plan" },
  robots: { index: true, follow: true },
};

export default async function PlanPage() {
  if (await getCurrentUser()) redirect("/record/development");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Write your development plan</h1>
          <p>
            A goal is a need, what you&rsquo;ll do about it, how you&rsquo;ll show it worked, and
            a date. No account needed — it stays in this browser until you choose to keep it.
          </p>
        </div>
      </div>
      <GuestPlan />
    </main>
  );
}
