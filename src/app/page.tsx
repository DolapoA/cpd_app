import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RollingProfessions } from "@/components/rolling-professions";
import { Reveal } from "@/components/reveal";
import { GUIDES } from "@/lib/guides";
import { DemoVideo } from "@/components/demo-video";

export const metadata = {
  // The one page meant to be found. The title carries the job people search
  // for, not the product name alone.
  title: "CPD records and attendance registers for UK professionals",
  description:
    "Run an attendance register at your event, let people sign with a QR code, and keep a dated CPD record you can export for audit or appraisal. Built for HCPC, GMC, NMC, GDC, GPhC, RICS and other UK regulated professions.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  // The image already carries the promise and the regulators, so the words
  // beneath it carry what a picture cannot: that it is free, and that the
  // record comes back out again in a form a regulator will take.
  openGraph: {
    title: "CPD evidence that captures itself",
    description:
      "Sign the register at your event and it lands on your CPD record, dated and verified. Free, and ready to export for audit or appraisal.",
    url: "/",
    type: "website",
  },
  // Stated again rather than left to fall back on the site-wide defaults in
  // the root layout, which describe the app rather than this page.
  twitter: {
    card: "summary_large_image",
    title: "CPD evidence that captures itself",
    description:
      "Sign the register at your event and it lands on your CPD record, dated and verified. Free, and ready to export for audit or appraisal.",
  },
};


const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cpdregister.app";

/**
 * Structured data for the home page.
 *
 * Two things only, both true and both checkable on the page itself: what the
 * site is, and that it is free to create an account. Marking up claims a
 * visitor cannot verify is how sites lose rich results altogether.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}#website`,
      url: SITE,
      name: "CPD Register",
      inLanguage: "en-GB",
      description:
        "Attendance registers, verifiable attendance slips, and a regulator-ready CPD record for UK professionals with CPD obligations.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE}#app`,
      name: "CPD Register",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE,
      description:
        "Run an attendance register at your event, let attendees sign with a QR code, and keep a dated CPD record you can export for audit or appraisal.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    },
  ],
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <section className="hero">
        <h1>CPD evidence that captures itself</h1>
        <RollingProfessions />
        <div className="actions-row">
          <Link href="/signup" className="btn btn--large">
            Create a free account
          </Link>
          <Link href="/login" className="btn btn--secondary btn--large">
            Log in
          </Link>
        </div>
      </section>

      <div className="container stack">
        {/* The product, before the sign-up ask. Three quarters of visitors
            were leaving this page without a second view, having been shown
            claims and no product: so, the tour on the left, and on the right
            the one thing a visitor can do here that is theirs to keep. */}
        <section className="demo" id="try">
          <DemoVideo />
          {/* The right column carries as much as the left: the plan first,
              then what the app does, in a grid that stretches to the phone's
              height — a card alone beside a tall frame left a void under it. */}
          <div className="demo__side">
            <div className="card demo__card">
              <h2>Start with your development plan</h2>
              <p className="muted">
                Write the goals your next appraisal will ask about — the need, what you&rsquo;ll
                do, how you&rsquo;ll show it worked, and by when. No account needed; keep it with
                one when you&rsquo;re done.
              </p>
              <div className="actions-row">
                <Link href="/plan" className="btn btn--large">
                  Write my plan
                </Link>
              </div>
            </div>

            <div className="grid-2">
              <Reveal className="card">
                <h3>Audit-ready records</h3>
                <p className="muted">
                  Dated, categorised, and exportable for any period — in the shape your
                  regulator expects. Every slip carries a code an auditor can verify online.
                </p>
              </Reveal>
              <Reveal className="card" delay={80}>
                <h3>Official and unofficial CPD</h3>
                <p className="muted">
                  Accredited conferences and informal journal clubs both count.
                </p>
              </Reveal>
              <Reveal className="card">
                <h3>For event organisers</h3>
                <p className="muted">
                  Create a register in a minute, put the QR on your closing slide, and watch
                  signatures arrive live. Registers open and close around your event, so they
                  stand up as evidence.
                </p>
              </Reveal>
              <Reveal className="card" delay={80}>
                <h3>For attendees</h3>
                <p className="muted">
                  Scan, sign, done. Guests download a verifiable PDF slip on the spot. Account
                  holders get it added to their record automatically.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <div className="grid-2">
          <Reveal className="card">
            <h3>Personal development plan</h3>
            <p className="muted">
              Goals with a need, the actions, how you&rsquo;ll show it worked and a date —
              reviewed as achieved, carried forward or retired, and printed into your appraisal
              pack.
            </p>
          </Reveal>
          <Reveal className="card" delay={80}>
            <h3>Multi-source feedback</h3>
            <p className="muted">
              Ask colleagues to rate how you practise, anonymously. The gap between their view
              and your own becomes your development goals.
            </p>
          </Reveal>
        </div>

        <Reveal className="card">
          <h3>Bringing a record with you?</h3>
          <p className="muted">
            Upload a CSV or Excel file, check the preview, and your CPD record moves across in
            one go.
          </p>
        </Reveal>

        {/* The guides are the only substantial public content, so the home
            page links to them by name rather than leaving them reachable only
            from a sitemap — a page nothing links to is a page nobody finds. */}
        <Reveal className="card">
          <h3>What does your regulator actually ask for?</h3>
          <p className="muted">
            Short guides to what each body expects you to keep, and what has to be recorded
            against every activity.
          </p>
          {/* Every guide, not the first five. These are the only pages on the
              site meant to be found from outside, and a link from the home
              page is the strongest signal the site can give its own pages —
              five of ten linked left the rest two hops out, which is where a
              crawler with no reason to hurry leaves them. */}
          <ul className="bullets small">
            {GUIDES.map((guide) => (
              <li key={guide.slug}>
                <Link href={`/cpd/${guide.slug}`}>{guide.title}</Link>
              </li>
            ))}
            <li>
              <Link href="/cpd">All professions and regulators →</Link>
            </li>
          </ul>
        </Reveal>
      </div>
    </main>
  );
}
