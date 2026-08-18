import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type Employment } from "@/lib/db";
import { addEmployment, deleteEmployment } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { EmploymentFields } from "@/components/employment-fields";

export const metadata = { title: "Where you have worked — CPD Register" };

/** "July 2023", from the YYYY-MM the database holds. */
function monthLabel(value: string): string {
  return new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "July 2023 – present", or a closed range. */
function period(job: Employment): string {
  return `${monthLabel(job.started_on)} – ${job.ended_on ? monthLabel(job.ended_on) : "present"}`;
}

export default async function EmploymentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { saved } = await searchParams;

  // Current posts first, then most recent — which is the order a CV uses and
  // the order somebody reads their own history in.
  const jobs = (await (await getDb())
    .prepare(
      `SELECT * FROM employments WHERE user_id = ?
        ORDER BY ended_on IS NOT NULL, ended_on DESC NULLS FIRST, started_on DESC`
    )
    .all(user.id)) as Employment[];

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Where you have worked</h1>
          <p>
            Appraisals and audits cover a period, and a period can span more than one job.{" "}
            <Link href="/profile">Back to your profile</Link>
          </p>
        </div>
      </div>

      {saved === "1" && (
        <div className="notice notice--ok">
          <p className="small">Added.</p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="card card--flush">
          <div className="table-wrap">
            <table className="table table--stack">
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td data-label=".">
                      <strong>{job.employer}</strong>
                      {job.job_title && <div className="muted small">{job.job_title}</div>}
                      <div className="muted small">{period(job)}</div>
                    </td>
                    <td className="col--actions" data-label=".">
                      <details className="mini-menu">
                        <summary className="btn btn--quiet btn--small">Remove</summary>
                        <div className="mini-menu__body confirm">
                          <p className="small">
                            Remove <strong>{job.employer}</strong> from your history?
                          </p>
                          <form action={deleteEmployment}>
                            <input type="hidden" name="id" value={job.id} />
                            <button type="submit" className="btn btn--danger btn--small">
                              Yes, remove it
                            </button>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2>{jobs.length === 0 ? "Add your first job" : "Add another"}</h2>
        <ActionForm action={addEmployment} submitLabel="Add to my history">
          <EmploymentFields />
        </ActionForm>
      </div>
    </main>
  );
}
