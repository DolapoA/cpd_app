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
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>CPD requirements by profession</h1>
          <p>
            What your regulator actually asks for, what has to be recorded against each activity,
            and how to keep evidence you can hand over without a weekend of reconstruction.
          </p>
        </div>
      </div>

      <div className="card">
        <ul className="task-list">
          {GUIDES.map((guide) => (
            <li key={guide.slug} className="task">
              <span className="task__mark" aria-hidden="true" />
              <span>
                <span className="task__label">
                  <Link href={`/cpd/${guide.slug}`}>{guide.title}</Link>
                </span>
                <span className="task__detail"> — for {guide.audience}.</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="hint">
        These pages describe what each body publishes, and link to it. They are not advice, and we
        are not your regulator — where this site and your regulator disagree, your regulator is
        right.
      </p>
    </main>
  );
}
