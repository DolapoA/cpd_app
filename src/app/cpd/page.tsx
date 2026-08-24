import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata = {
  title: "CPD requirements by profession and regulator",
  description:
    "What each UK regulator asks registrants to keep: HCPC, GMC, NMC, GPhC, GDC, RICS, ARB, GTCS and the engineering institutions — and how to keep a record that satisfies it.",
  alternates: { canonical: "/cpd" },
  robots: { index: true, follow: true },
};

export default function GuidesIndexPage() {
  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>CPD requirements by profession</h1>
          <p>
            What your regulator actually asks for, what has to be recorded against each activity,
            and how to keep evidence you can hand over without a weekend of reconstruction.
          </p>
        </div>
      </div>

      <div className="guide-grid">
        {GUIDES.map((guide) => (
          <Link key={guide.slug} href={`/cpd/${guide.slug}`} className="card guide-card">
            <span className="guide-card__title">{guide.title}</span>
            <span className="muted small">For {guide.audience}.</span>
          </Link>
        ))}
      </div>

      <p className="hint">
        These pages describe what each body publishes, and link to it. They are not advice, and we
        are not your regulator — where this site and your regulator disagree, your regulator is
        right.
      </p>
    </main>
  );
}
