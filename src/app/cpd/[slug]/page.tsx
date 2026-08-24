import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES, guideFor } from "@/lib/guides";
import { STANDARDS_FRAMEWORKS } from "@/lib/standards";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const guide = guideFor((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/cpd/${guide.slug}` },
    // Opted in explicitly: the site is noindex by default, and these guides
    // are the only substantial pages meant to be found.
    robots: { index: true, follow: true },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `/cpd/${guide.slug}`,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideFor((await params).slug);
  if (!guide) notFound();

  const framework = guide.framework ? STANDARDS_FRAMEWORKS[guide.framework] : null;

  // Marked up so the questions can appear as answers in search results. Only
  // the questions actually on the page are described, which is both the rule
  // and the only honest thing to do.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="container stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="page-head">
        <div>
          <p className="muted small">
            <Link href="/cpd">CPD guides</Link>
          </p>
          <h1>{guide.title}</h1>
          <p>For {guide.audience}.</p>
        </div>
      </div>

      <div className="guide-layout">
        <div className="stack guide-main">
      <div className="card">
        <h2>What {guide.bodyName} asks for</h2>
        <p>{guide.requirement}</p>
        {framework?.sourceUrl && (
          <p className="hint">
            Source:{" "}
            <a href={framework.sourceUrl} target="_blank" rel="noopener noreferrer">
              {guide.body}&rsquo;s own guidance
            </a>
            . Where this page and your regulator disagree, your regulator is right — we are not
            your regulator and do not speak for one.
          </p>
        )}
      </div>

      {framework && (
        <div className="card">
          <h2>What each activity is recorded against</h2>
          <p className="muted small">{framework.mandate}</p>
          <ul className="bullets small">
            {framework.items.map((item) => (
              <li key={item.code}>
                <strong>{item.code}</strong> — {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>Common questions</h2>
        {guide.faqs.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p className="small">{f.a}</p>
          </div>
        ))}
      </div>

        </div>
        <aside className="stack guide-rail">
      <div className="card">
        <h2>How CPD Register helps</h2>
        <p className="small">
          Sign an attendance register at an event and it lands on your record dated and
          attributed, rather than being typed in from memory months later. Everything else you can
          add yourself, or import from the spreadsheet you already keep.
        </p>
        <p className="small">
          <strong>{guide.output.label}:</strong> {guide.output.blurb}
        </p>
        <div className="actions-row">
          <Link href="/signup" className="btn">
            Create a free account
          </Link>
          <Link href="/" className="btn btn--quiet">
            How it works
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Other professions</h2>
        <ul className="bullets small">
          {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <li key={g.slug}>
              <Link href={`/cpd/${g.slug}`}>{g.title}</Link>
            </li>
          ))}
        </ul>
      </div>
        </aside>
      </div>
    </main>
  );
}
