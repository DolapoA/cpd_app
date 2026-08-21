import Link from "next/link";
import { CURRENCY, PLANS } from "@/lib/plans";

/**
 * The three tiers, as cards.
 *
 * One component because the board appears twice — on the home page, where
 * someone deciding whether to sign up meets it, and at /plans, which is what
 * a search for pricing lands on. Two copies of a price list is how a price
 * list ends up contradicting itself.
 *
 * The billing switch stays with the pages: it is a pair of links whose
 * destination depends on which page you are standing on.
 */
export function PlanBoard({ yearly, signedIn }: { yearly: boolean; signedIn: boolean }) {
  return (
    <div className="plans">
      {PLANS.map((plan) => {
        const price = yearly ? plan.priceYearly : plan.priceMonthly;
        const numeric = /^[0-9]/.test(price);
        return (
          <section className={`plan${plan.featured ? " plan--featured" : ""}`} key={plan.id}>
            {plan.featured && <p className="plan__flag">Most organisers</p>}
            <h3 className="plan__name">{plan.name}</h3>
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
              href={plan.id === "professional" && signedIn ? "/dashboard" : plan.cta.href}
              className={`btn${plan.featured ? "" : " btn--secondary"}`}
            >
              {plan.id === "professional" && signedIn ? "Go to your record" : plan.cta.label}
            </Link>
          </section>
        );
      })}
    </div>
  );
}
