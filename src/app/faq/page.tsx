import Link from "next/link";
import { FAQ_GROUPS } from "@/lib/faq";

export const metadata = {
  title: "Questions and answers",
  description:
    "How CPD Register handles your account, your profile, your CPD record, attendance registers and reminders.",
  alternates: { canonical: "/faq" },
  // One of the few pages worth finding from outside: these are the questions
  // people ask before they sign up as well as after.
  robots: { index: true, follow: true },
};

export default function FaqPage() {
  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Questions and answers</h1>
          <p>
            The explanations that used to sit under every control, in one place instead.
          </p>
        </div>
      </div>

      {FAQ_GROUPS.map((group) => (
        <section key={group.heading} className="card stack stack--tight">
          <h2>{group.heading}</h2>
          {group.questions.map((item) => (
            <details key={item.q} className="faq">
              <summary className="faq__q">{item.q}</summary>
              <p className="faq__a">{item.a}</p>
            </details>
          ))}
        </section>
      ))}

      <p className="muted small">
        Something here that doesn&rsquo;t answer it? <Link href="/feedback">Ask us</Link>.
      </p>
    </main>
  );
}
