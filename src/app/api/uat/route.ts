import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendUatSubmission, type UatResult, type UatSubmission } from "@/lib/email";

/**
 * TEMPORARY — where user acceptance testing results land. Delete after
 * acceptance testing.
 *
 * The test script itself is a standalone HTML file kept outside this
 * repository, so a tester runs it from their own disk or from wherever it was
 * emailed to them. That means the request arrives cross-origin — Origin "null"
 * from file://, or some other host — hence the open CORS headers below. They
 * are acceptable here and only here: the route holds no session, reads
 * nothing, and returns nothing an attacker could not have posted themselves.
 *
 * To remove the whole feature:
 *   1. delete this directory (src/app/api/uat)
 *   2. delete sendUatSubmission and its types from src/lib/email.ts
 *   3. delete the uat_submissions block from MIGRATIONS in src/lib/db.ts
 *   4. run: DROP TABLE uat_submissions;
 *   5. drop UAT_TO from .env.example and from the deployment's environment
 */
export const dynamic = "force-dynamic";

/**
 * Enough for a long script with notes on every case, and far short of what it
 * would take to fill the table from a script. Checked before parsing, because
 * JSON.parse on ten megabytes has already cost you the ten megabytes.
 */
const MAX_BODY = 1_000_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function ok(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

function fail(status: number, error: string) {
  return ok({ ok: false, error }, status);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Trimmed, length-capped, and never undefined — the columns are all nullable
 *  TEXT and a missing field should read as blank, not break the insert. */
function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return fail(413, "Submission too large.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail(400, "Body is not valid JSON.");
  }

  const body = parsed as Partial<UatSubmission>;
  if (!body || typeof body !== "object" || !body.meta || !body.summary || !Array.isArray(body.results)) {
    return fail(400, "Expected meta, summary and results.");
  }

  // Rebuilt rather than trusted: the form is a file anybody can edit, and the
  // shape below is the one the table and the email are written against.
  const submission: UatSubmission = {
    meta: {
      name: str(body.meta.name, 200),
      role: str(body.meta.role, 200),
      profession: str(body.meta.profession, 200),
      device: str(body.meta.device, 200),
      browser: str(body.meta.browser, 200),
      date: str(body.meta.date, 20),
    },
    summary: {
      pass: num(body.summary.pass),
      fail: num(body.summary.fail),
      block: num(body.summary.block),
      left: num(body.summary.left),
      total: num(body.summary.total),
    },
    verdict: str(body.verdict, 500),
    results: body.results.slice(0, 500).map((r): UatResult => {
      const row = (r ?? {}) as Partial<UatResult>;
      return {
        id: str(row.id, 50),
        area: str(row.area, 200),
        priority: str(row.priority, 50),
        title: str(row.title, 500),
        qa_only: str(row.qa_only, 10),
        result: str(row.result, 50),
        severity: str(row.severity, 50),
        notes: str(row.notes, 5000),
      };
    }),
    generatedAt: str(body.generatedAt, 40) || new Date().toISOString(),
  };

  // Stored first and emailed second, in separate try/catch blocks. A tester
  // walks the script once; if the mail fails, the run must still be sitting in
  // the table rather than gone with the tab they closed.
  try {
    const db = await getDb();
    await db
      .prepare(
        `INSERT INTO uat_submissions
           (submitted_at, tester_name, role, profession, device, browser, test_date, verdict,
            pass_count, fail_count, blocked_count, untested_count, total_count, results, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        new Date().toISOString(),
        submission.meta.name,
        submission.meta.role,
        submission.meta.profession,
        submission.meta.device,
        submission.meta.browser,
        submission.meta.date,
        submission.verdict,
        submission.summary.pass,
        submission.summary.fail,
        submission.summary.block,
        submission.summary.left,
        submission.summary.total,
        // Serialised here rather than handed over as an array: node-postgres
        // would send a JS array as a Postgres array literal, which jsonb
        // refuses.
        JSON.stringify(submission.results),
        request.headers.get("user-agent") ?? ""
      );
  } catch (error) {
    console.error("[uat] could not store submission", error);
    // Still worth trying to send: an email nobody stored beats losing the run
    // outright, and the full payload is attached to it.
    try {
      await sendUatSubmission(submission);
      return ok({ ok: true });
    } catch (mailError) {
      console.error("[uat] could not email submission either", mailError);
      // Logged in full, so the run is recoverable from the server log.
      console.error("[uat] unstored submission:", JSON.stringify(submission));
      return fail(500, "Could not save your results. Please send the JSON to info@cpdregister.app.");
    }
  }

  try {
    await sendUatSubmission(submission);
  } catch (error) {
    // The row is in. Whoever is collating can read it out of the table, so the
    // tester is told nothing went wrong — because as far as they are concerned
    // nothing did.
    console.error("[uat] stored but not emailed", error);
  }

  return ok({ ok: true });
}
