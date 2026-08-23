import Link from "next/link";

export const metadata = { title: "Thank you — CPD Register" };

/**
 * After answering.
 *
 * The invitation to sign up carries nothing from the response — no token, no
 * request id, no query parameter. A guest who signs a register has their slip
 * carried across deliberately; here the opposite is required, because an
 * account traceable to a response would undo the whole promise.
 */
export default async function MsfThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ declined?: string }>;
}) {
  const { declined } = await searchParams;

  return (
    <main className="container container--narrow stack">
      <div className="card">
        <h1>{declined === "1" ? "That's fine" : "Thank you"}</h1>
        <p className="muted">
          {declined === "1"
            ? "Nothing was sent, and you will not be reminded."
            : "Your answers are in, pooled and unattributed. Your colleague sees them once the round closes."}
        </p>
      </div>

      <div className="card">
        <h2>Keep your own CPD record</h2>
        <p className="muted small">
          Free for professionals: a dated record, QR attendance registers, and colleague
          feedback of your own.
        </p>
        <div className="actions-row">
          <Link href="/signup" className="btn">
            Create a free account
          </Link>
          <Link href="/" className="btn btn--quiet">
            What is this?
          </Link>
        </div>
      </div>
    </main>
  );
}
