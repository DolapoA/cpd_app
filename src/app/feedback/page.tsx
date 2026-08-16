import { getCurrentUser } from "@/lib/auth";
import { FeedbackReportForm } from "@/components/feedback-report-form";

export const metadata = {
  title: "Tell us what's wrong",
  robots: { index: false, follow: false },
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ about?: string }>;
}) {
  const user = await getCurrentUser();
  const { about } = await searchParams;

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Tell us what&rsquo;s wrong</h1>
          <p>
            Reports genuinely change what gets fixed next. Small annoyances are worth sending —
            those are the ones nobody reports.
          </p>
        </div>
      </div>

      <div className="card">
        <FeedbackReportForm signedInAs={user?.email ?? null} aboutPage={about} />
      </div>

      <p className="muted small">
        If something has gone wrong with your CPD record specifically, say which activity — we can
        look without you sending anything else.
      </p>
    </main>
  );
}
