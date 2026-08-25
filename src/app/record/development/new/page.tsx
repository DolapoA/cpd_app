import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { addPdpGoal } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { PdpFields } from "@/components/pdp-fields";
import { releasedMsfRound } from "@/lib/msf-invites";
import { MSF_RATED_QUESTIONS, summariseMsfItem } from "@/lib/msf";

export const metadata = { title: "Add a development goal — CPD Register" };

/**
 * A new goal, blank or born from an MSF gap.
 *
 * ?msf=<round>&q=<question> arrives from a released round's gap card. The
 * round is re-checked here — owner, closed, self-assessment, enough asked —
 * because a query string is an opinion, not a permission: an unreleased
 * round's mean must not leak into a form via a guessed URL.
 */
export default async function NewPdpGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ msf?: string; q?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { msf, q } = await searchParams;

  let prefill: { title?: string; identifiedFrom?: string } | undefined;
  let msfRequestId: number | null = null;

  if (msf && q) {
    const round = await releasedMsfRound(user.id, Number(msf));
    const question = MSF_RATED_QUESTIONS.find((item) => item.key === q);
    if (round && question) {
      const item = summariseMsfItem(
        question,
        round.responses.map((r) => Number(r[question.key as `q${number}`] ?? 0))
      );
      const own = Number(round.selfAnswers[question.key] ?? 0);
      msfRequestId = round.request.id;
      prefill = {
        title: question.short,
        identifiedFrom:
          item.mean !== null && own >= 1
            ? `MSF ${round.request.reference}: colleagues ${item.mean.toFixed(1)}, you ${own}`
            : `MSF ${round.request.reference}`,
      };
    }
  }

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Add a development goal</h1>
          <p>The need, what you&rsquo;ll do, and how you&rsquo;ll know.</p>
        </div>
      </div>

      <div className="card">
        <ActionForm action={addPdpGoal} submitLabel="Add to my plan">
          {msfRequestId !== null && (
            <input type="hidden" name="msf_request_id" value={msfRequestId} />
          )}
          <PdpFields prefill={prefill} />
        </ActionForm>
      </div>

      <p className="muted small">
        <Link href="/record/development">← Back to your development plan</Link>
      </p>
    </main>
  );
}
