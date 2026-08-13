import { getDb, type Register, type Signature } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Verify attendance slip — CPD Register" };

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = getDb();
  const sig = db
    .prepare("SELECT * FROM signatures WHERE verification_code = ?")
    .get(decodeURIComponent(code)) as Signature | undefined;

  if (!sig) {
    return (
      <main className="container container--narrow stack">
        <div className="card">
          <h1>✗ Not verified</h1>
          <p className="form-error">
            No attendance record matches the code <span className="mono">{code}</span>. The slip
            may have been altered, or the code mistyped.
          </p>
        </div>
      </main>
    );
  }

  const reg = db.prepare("SELECT * FROM registers WHERE id = ?").get(sig.register_id) as Register;

  return (
    <main className="container container--narrow stack">
      <div className="card">
        {sig.voided ? (
          <>
            <h1>⚠ Voided record</h1>
            <p className="form-error">
              This attendance record exists but was voided by the organiser
              {sig.void_reason ? `: ${sig.void_reason}` : "."}
            </p>
          </>
        ) : (
          <>
            <h1>✓ Verified</h1>
            <p className="muted">
              This attendance record is genuine and was captured live on the register.
            </p>
          </>
        )}
        <table className="table">
          <tbody>
            <tr>
              <td className="muted">Attendee</td>
              <td>
                <strong>{sig.full_name}</strong>
                {sig.registration_number
                  ? ` (${sig.professional_body ?? ""} ${sig.registration_number})`
                  : ""}
              </td>
            </tr>
            <tr>
              <td className="muted">Event</td>
              <td>
                {reg.title} — {formatDate(reg.event_date)}, {reg.start_time}–{reg.end_time}
              </td>
            </tr>
            <tr>
              <td className="muted">Organiser</td>
              <td>{reg.organiser_name}</td>
            </tr>
            <tr>
              <td className="muted">CPD status</td>
              <td>
                {reg.is_official
                  ? `Official CPD — ${reg.points} points (${reg.accrediting_body})`
                  : "Unofficial CPD activity"}
              </td>
            </tr>
            <tr>
              <td className="muted">Signed</td>
              <td>{formatDateTime(sig.signed_at)} (server timestamp)</td>
            </tr>
            <tr>
              <td className="muted">Capture</td>
              <td>{sig.user_id ? "Signed while logged in (platform-verified)" : "Signed as guest"}</td>
            </tr>
            <tr>
              <td className="muted">Code</td>
              <td className="mono">{sig.verification_code}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
