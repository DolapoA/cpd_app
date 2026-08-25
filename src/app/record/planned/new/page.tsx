import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type PdpGoal } from "@/lib/db";
import { addPlannedEvent } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { PlannedFields } from "@/components/planned-fields";

export const metadata = { title: "Add planned CPD — CPD Register" };

/**
 * Adding something to the plan, on a page of its own.
 *
 * It used to sit under the list it adds to, which put a seventeen-field form
 * on the same screen as the thing you were reading. Every other list in this
 * app already works this way — /record and /registers both send you to a page
 * to create — and the edit page beside this one has always been the proof that
 * the form travels perfectly well on its own.
 */
export default async function NewPlannedPage() {
  const user = await requireConfirmedUser();
  const goals = (await (await getDb())
    .prepare(
      "SELECT id, title FROM pdp_goals WHERE user_id = ? AND status = 'active' ORDER BY target_date ASC NULLS LAST"
    )
    .all(user.id)) as Pick<PdpGoal, "id" | "title">[];

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Add something you&rsquo;re going to</h1>
          <p>
            A conference, course or study day you already know about. When the date passes
            we&rsquo;ll ask whether you went, and add it to your record if you did.
          </p>
        </div>
      </div>

      <div className="card">
        <ActionForm action={addPlannedEvent} submitLabel="Add to my plan">
          <PlannedFields goals={goals} />
        </ActionForm>
      </div>

      <p className="muted small">
        <Link href="/record/planned">← Back to your plan</Link>
      </p>
    </main>
  );
}
