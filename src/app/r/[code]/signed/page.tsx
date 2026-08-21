import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, type Register, type Signature } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata = { title: "Attendance recorded — CPD Register" };

export default async function SignedPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ sig?: string; thanks?: string }>;
}) {
  const { code } = await params;
  const { sig, thanks } = await searchParams;
  if (!sig) notFound();

  const db = await getDb();
  const signature = await db
    .prepare("SELECT * FROM signatures WHERE verification_code = ?")
    .get(sig) as Signature | undefined;
  if (!signature) notFound();

  const reg = await db.prepare("SELECT * FROM registers WHERE id = ?").get(signature.register_id) as
    | Register
    | undefined;
  if (!reg || reg.code !== code) notFound();

  const user = await getCurrentUser();

  const showFeedbackForm =
    !!reg.feedback_enabled && !signature.voided && !signature.feedback_given && thanks !== "1";

  return (
    <main className="container container--narrow stack">
      <div className="card card--center">
        <h1>✓ Attendance recorded</h1>
        <p className="muted">
          {signature.full_name} — {reg.title}, {formatDate(reg.event_date)}
          <br />
          Signed {formatDateTime(signature.signed_at)}
        </p>
        <p>
          Verification code: <strong className="mono">{signature.verification_code}</strong>
        </p>
        <div className="actions-row actions-row--center">
          <a href={`/slip/${signature.verification_code}`} className="btn btn--large">
            Download attendance slip (PDF)
          </a>
        </div>
        <p className="muted small">
          Anyone can confirm this slip is genuine at{" "}
          <Link href={`/verify/${signature.verification_code}`} className="mono">
            /verify/{signature.verification_code}
          </Link>
        </p>
      </div>

      {thanks === "1" && (
        <div className="notice notice--ok">
          <p>
            ✓ Thank you — your feedback has been sent to the organiser without your name attached.
          </p>
        </div>
      )}

      {showFeedbackForm && (
        <FeedbackForm
          verificationCode={signature.verification_code}
          canKeepReflection={!!signature.user_id}
        />
      )}

      {signature.user_id ? (
        <div className="card">
          <p>
            This attendance has been added to <Link href="/record">your CPD record</Link> and
            marked <span className="badge badge--verified">Platform-verified</span>.
          </p>
        </div>
      ) : (
        <div className="card">
          <h3>Keep this — and every future slip — automatically</h3>
          <div className="actions-row">
            <Link href="/signup" className="btn btn--large">
              Create a free account
            </Link>
            <Link href="/login" className="btn btn--quiet">
              I already have one
            </Link>
          </div>
        </div>
      )}
          <p className="muted small">
        Something not right with this slip?{" "}
        <Link href="/feedback?about=/r/signed">Let us know</Link>.
      </p>
    </main>
  );
}