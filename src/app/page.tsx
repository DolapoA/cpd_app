import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RollingProfessions } from "@/components/rolling-professions";
import { Reveal } from "@/components/reveal";

export const metadata = {
  // The one page meant to be found. The title carries the job people search
  // for, not the product name alone.
  title: "CPD records and attendance registers for UK professionals",
  description:
    "Run an attendance register at your event, let people sign with a QR code, and keep a dated CPD record you can export for audit or appraisal. Built for HCPC, GMC, NMC, GDC, GPhC, RICS and other UK regulated professions.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "CPD evidence that captures itself",
    description:
      "Attendance registers, verifiable slips, and a CPD record ready for audit or appraisal.",
    url: "/",
    type: "website",
  },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main>
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
        <div className="grid-2">
          <Reveal className="card">
            <h3>For event organisers</h3>
            <p className="muted">
              Create a register in a minute, put the QR on your closing slide, and watch
              signatures arrive live. Registers open and close around your event, so they stand up
              as evidence.
            </p>
          </Reveal>
          <Reveal className="card" delay={80}>
            <h3>For attendees</h3>
            <p className="muted">
              Scan, sign, done. Guests download a verifiable PDF slip on the spot. Account
              holders get it added to their record automatically.
            </p>
          </Reveal>
          <Reveal className="card">
            <h3>Audit-ready records</h3>
            <p className="muted">
              Dated, categorised, and exportable for any period — in the shape your regulator
              expects. Every slip carries a code an auditor can verify online.
            </p>
          </Reveal>
          <Reveal className="card" delay={80}>
            <h3>Official and unofficial CPD</h3>
            <p className="muted">
              Accredited conferences and informal journal clubs both count.
            </p>
          </Reveal>
        </div>

        <Reveal className="card">
          <h3>Bringing a record with you?</h3>
          <p className="muted">
            Upload a CSV or Excel file, check the preview, and your history moves across in one
            go — however you labelled your columns.
          </p>
        </Reveal>
      </div>
    </main>
  );
}
