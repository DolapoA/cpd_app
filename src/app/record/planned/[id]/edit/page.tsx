import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type PlannedEvent } from "@/lib/db";
import { updatePlannedEvent } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { PlannedFields } from "@/components/planned-fields";

export const metadata = { title: "Edit planned CPD — CPD Register" };

export default async function EditPlannedPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireConfirmedUser();

  const { id } = await params;
  const plan = (await (await getDb())
    .prepare("SELECT * FROM planned_events WHERE id = ? AND user_id = ?")
    .get(Number(id), user.id)) as PlannedEvent | undefined;
  if (!plan) notFound();

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Edit</h1>
          <p>
            Changes reach any calendar you have subscribed — though Google can take a few hours
            to look again.
          </p>
        </div>
      </div>

      <div className="card">
        <ActionForm action={updatePlannedEvent} submitLabel="Save changes">
          <input type="hidden" name="id" value={plan.id} />
          <PlannedFields plan={plan} />
        </ActionForm>
      </div>

      <p className="muted small">
        <Link href="/record/planned">← Back to your plan</Link>
      </p>
    </main>
  );
}
