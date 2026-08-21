import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getDb, registerStatus, type Register, type Signature } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { getShareBase } from "@/lib/base-url";
import { formatDate, formatDateTime } from "@/lib/format";
import { setFeedbackEnabled, setRegisterClosed, voidSignature } from "@/lib/actions";

export const metadata = { title: "Register — CPD Register" };

export default async function RegisterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const user = await requireConfirmedUser();

  const { id } = await params;
  const { updated } = await searchParams;
  const db = await getDb();
  const reg = await db.prepare("SELECT * FROM registers WHERE id = ?").get(Number(id)) as
    | Register
    | undefined;
  if (!reg || reg.organiser_id !== user.id) notFound();

  const signatures = await db
    .prepare("SELECT * FROM signatures WHERE register_id = ? ORDER BY signed_at DESC")
    .all(reg.id) as Signature[];

  const feedbackCount = (
    await db
      .prepare("SELECT COUNT(*) AS c FROM feedback_responses WHERE register_id = ?")
      .get(reg.id) as { c: number }
  ).c;

  const shareBase = await getShareBase();
  const shareUrl = `${shareBase.url}/r/${reg.code}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 480, margin: 1 });

  const status = registerStatus(reg);
  const activeCount = signatures.filter((s) => !s.voided).length;

  return (
    <main className="container stack">
      {updated === "1" && (
        <div className="notice notice--ok">
          <p className="small">
            Saved. The joining code and QR are unchanged &mdash; but anyone you invited still has
            the old details, so tell them what moved.
          </p>
        </div>
      )}

      <div className="page-head">
        <div>
          <h1>{reg.title}</h1>
          <p>
            {formatDate(reg.event_date)} · {reg.start_time}–{reg.end_time}
            {reg.location ? ` · ${reg.location}` : ""} · {reg.event_type}
          </p>
        </div>
        <span
          className={`badge ${
            status === "open" ? "badge--open" : status === "closed" ? "badge--closed" : "badge--neutral"
          }`}
        >
          {status === "open" ? "Open for signatures" : status === "closed" ? "Closed" : "Not open yet"}
        </span>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Share the register</h2>
          <p className="muted small">
            Show the QR at the end of your session, or share the link. Attendees sign on their
            phones — no account needed.
          </p>
          <div className="qr-box">
            <img src={qrDataUrl} alt={`QR code linking to ${shareUrl}`} />
          </div>
          <p className="share-url mono">{shareUrl}</p>
          {shareBase.substitutedForLoopback && (
            <p className="hint">
              You&rsquo;re browsing on localhost, which a phone can&rsquo;t reach — so this code
              points at your machine&rsquo;s network address instead. It works on any device on
              the same Wi-Fi.
            </p>
          )}
          {shareBase.unreachable && (
            <p className="form-error">
              You&rsquo;re on localhost and no network address was found, so this code
              won&rsquo;t scan from another device. Connect to a network and reload.
            </p>
          )}
          {reg.access_code && (
            <p className="small">
              Access code to announce in the room: <strong className="mono">{reg.access_code}</strong>
            </p>
          )}
          <div className="actions-row">
            <Link href={`/registers/${reg.id}/projector`} className="btn btn--secondary">
              Projector mode
            </Link>
            <a href={qrDataUrl} download={`register-${reg.code}-qr.png`} className="btn btn--secondary">
              Download QR (PNG)
            </a>
          </div>
        </div>

        <div className="card">
          <div className="page-head page-head--tight">
            <h2>Event details</h2>
            <Link href={`/registers/${reg.id}/edit`} className="btn btn--quiet btn--small">
              Edit
            </Link>
          </div>
          <table className="table">
            <tbody>
              <tr>
                <td className="muted">CPD status</td>
                <td>
                  {reg.is_official ? (
                    <span className="badge badge--official">
                      Official · {reg.points} pts ({reg.accrediting_body})
                    </span>
                  ) : (
                    <span className="badge badge--nonofficial">Unofficial</span>
                  )}
                </td>
              </tr>
              {reg.hours != null && (
                <tr>
                  <td className="muted">Learning hours</td>
                  <td>{reg.hours}</td>
                </tr>
              )}
              <tr>
                <td className="muted">Opens</td>
                <td>{formatDateTime(reg.opens_at)}</td>
              </tr>
              <tr>
                <td className="muted">Closes</td>
                <td>{formatDateTime(reg.closes_at)}</td>
              </tr>
              <tr>
                <td className="muted">Organiser</td>
                <td>{reg.organiser_name}</td>
              </tr>
              <tr>
                <td className="muted">Feedback</td>
                <td>
                  {reg.feedback_enabled ? "Collected after sign-in · " : "Not being collected · "}
                  <Link href={`/registers/${reg.id}/feedback`}>
                    {feedbackCount} response{feedbackCount === 1 ? "" : "s"}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
          <hr className="divider" />
          <div className="actions-row">
            <form action={setRegisterClosed}>
              <input type="hidden" name="register_id" value={reg.id} />
              {reg.closed_manually ? (
                <>
                  <input type="hidden" name="closed" value="0" />
                  <button type="submit" className="btn btn--secondary btn--small">
                    Reopen register
                  </button>
                </>
              ) : (
                <>
                  <input type="hidden" name="closed" value="1" />
                  <button type="submit" className="btn btn--danger btn--small">
                    Close register now
                  </button>
                </>
              )}
            </form>
            <form action={setFeedbackEnabled}>
              <input type="hidden" name="register_id" value={reg.id} />
              <input type="hidden" name="enabled" value={reg.feedback_enabled ? "0" : "1"} />
              <button type="submit" className="btn btn--secondary btn--small">
                {reg.feedback_enabled ? "Stop collecting feedback" : "Collect feedback"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="card card--flush">
        <div className="page-head page-head--tight card__header">
          <h2>
            Signatures <span className="muted">({activeCount})</span>
          </h2>
          <a href={`/registers/${reg.id}/export`} className="btn btn--secondary btn--small">
            Export CSV
          </a>
        </div>
        <div className="table-wrap">
          <table className="table table--stack">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Body / reg no.</th>
                <th>Role</th>
                <th>Signed at</th>
                <th>Slip code</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {signatures.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No signatures yet. They appear here as attendees sign.
                  </td>
                </tr>
              )}
              {signatures.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.full_name}{" "}
                    {s.voided ? (
                      <span className="badge badge--voided" title={s.void_reason ?? undefined}>
                        Voided
                      </span>
                    ) : s.user_id ? (
                      <span className="badge badge--verified">Account</span>
                    ) : (
                      <span className="badge badge--nonofficial">Guest</span>
                    )}
                  </td>
                  <td>{s.email}</td>
                  <td>
                    {s.professional_body ?? "—"}
                    {s.registration_number ? ` · ${s.registration_number}` : ""}
                  </td>
                  <td>{s.role_grade ?? "—"}</td>
                  <td>{formatDateTime(s.signed_at)}</td>
                  <td className="mono small">{s.verification_code}</td>
                  <td>
                    {!s.voided && (
                      <form action={voidSignature}>
                        <input type="hidden" name="signature_id" value={s.id} />
                        <input type="hidden" name="reason" value="Voided by organiser" />
                        <button type="submit" className="btn btn--danger btn--small">
                          Void
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
