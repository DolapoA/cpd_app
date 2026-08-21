import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { BILLING_STATUS, CURRENCY, PLANS } from "@/lib/plans";

export const metadata = {
  title: "Plans",
  description:
    "CPD Register is free for professionals, permanently. Organisers who run events regularly pay £12 a month or £120 a year; organisations are priced from £500 a year.",
  alternates: { canonical: "/plans" },
  robots: { index: true, follow: true },
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const user = await getCurrentUser();
  const { billing } = await searchParams;
  const yearly = billing !== "monthly";

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Plans</h1>
          <p>
            Keeping your own CPD record is free, and stays free. Running events for other people
            is what we charge for.
          </p>
        </div>
      </div>

      <div className="notice notice--info">
        <p className="small">{BILLING_STATUS}</p>
      </div>

      {/* A plain link pair rather than a toggle: it survives without
          JavaScript and the choice is legible in the URL. */}
      <div className="billing-switch" role="group" aria-label="Billing period">
        <Link
          href="/plans?billing=monthly"
          className={`billing-switch__option${yearly ? "" : " is-on"}`}
          aria-current={yearly ? undefined : "true"}
        >
          Monthly
        </Link>
        <Link
          href="/plans"
          className={`billing-switch__option${yearly ? " is-on" : ""}`}
          aria-current={yearly ? "true" : undefined}
        >
          Yearly <span className="billing-switch__save">2 months free</span>
        </Link>
      </div>

      <div className="plans">
        {PLANS.map((plan) => {
          const price = yearly ? plan.priceYearly : plan.priceMonthly;
          const numeric = /^[0-9]/.test(price);
          return (
            <section className={`plan${plan.featured ? " plan--featured" : ""}`} key={plan.id}>
              {plan.featured && <p className="plan__flag">Most organisers</p>}
              <h2 className="plan__name">{plan.name}</h2>
              <p className="plan__audience">{plan.audience}</p>

              <p className="plan__price">
                {numeric && <span className="plan__currency">{CURRENCY}</span>}
                {price}
                {numeric && <span className="plan__period">/{yearly ? "year" : "month"}</span>}
              </p>
              <p className="plan__note">{plan.note}</p>

              <p className="plan__pitch">{plan.pitch}</p>

              <ul className="plan__features">
                {plan.features.map((f) => (
                  <li key={f.text} className={f.planned ? "is-planned" : undefined}>
                    <span className="plan__tick" aria-hidden="true">
                      {f.planned ? "○" : "✓"}
                    </span>
                    <span>
                      {f.text}
                      {f.planned && <span className="plan__soon">coming</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.id === "professional" && user ? "/dashboard" : plan.cta.href}
                className={`btn${plan.featured ? "" : " btn--secondary"}`}
              >
                {plan.id === "professional" && user ? "Go to your record" : plan.cta.label}
              </Link>
            </section>
          );
        })}
      </div>

      <div className="card">
        <h2>Why professionals don&rsquo;t pay</h2>
        <p className="small">
          Your regulator already obliges you to keep this record. Charging you to meet an
          obligation someone else imposed is a poor deal, and it is a crowded one — other
          portfolios cost a few pounds a month, and several professional bodies hand one out with
          membership.
        </p>
        <p className="small">
          The part worth paying for is the other side: capturing a room full of attendance in a
          form that stands up later. That has a budget behind it, and every free account makes it
          more useful, because there is someone there to sign.
        </p>
      </div>
    </main>
  );
}
