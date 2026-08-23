/**
 * Checks the database the app would actually use.
 *
 *   node scripts/db-check.mjs
 *
 * Reads DATABASE_URL from the environment or .env.local. Run it against
 * Supabase after deploying to confirm the schema arrived and writes work.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const m = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim();
  } catch {}
  return null;
}

const url = loadEnv();
if (!url) {
  console.error("DATABASE_URL is not set, and .env.local does not define it.");
  process.exit(1);
}

const host = (url.match(/@([^:/]+)/) || [])[1] ?? "?";
const port = (url.match(/:(\d+)\//) || [])[1] ?? "?";
const isSupabase = /supabase/i.test(host);

console.log(`host    ${host}`);
console.log(`port    ${port}${port === "6543" ? "  (transaction pooler)" : port === "5432" ? "  (direct connection)" : ""}`);
console.log(`target  ${isSupabase ? "Supabase" : "local Postgres"}\n`);

if (isSupabase && port !== "6543") {
  console.log("!  Supabase on port 5432 is the direct connection. Serverless functions");
  console.log("!  exhaust its connection limit under load — use the transaction pooler.\n");
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
});

const EXPECTED = [
  "users", "sessions", "registers", "signatures", "cpd_entries",
  "feedback_responses", "activity_type_goals", "auth_tokens", "auth_attempts",
  "planned_events", "employments", "push_subscriptions", "notified_events",
  "msf_requests", "msf_invitations", "msf_responses", "msf_self_assessments",
];

let problems = 0;
const ok = (label, good, detail = "") => {
  console.log(`${good ? "  ok  " : "FAIL  "}${label}${detail ? "  " + detail : ""}`);
  if (!good) problems++;
};

try {
  const t0 = Date.now();
  await pool.query("SELECT 1");
  const latency = Date.now() - t0;
  ok("connects", true, `${latency}ms`);
  if (latency > 300) {
    console.log(`      note: ${latency}ms is slow for a single round trip. If the app and the`);
    console.log("      database are in different regions, every page pays this several times.");
  }

  const { rows: tables } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const present = new Set(tables.map((r) => r.table_name));
  const missing = EXPECTED.filter((t) => !present.has(t));
  ok(`schema: ${EXPECTED.length} tables`, missing.length === 0,
     missing.length ? `missing ${missing.join(", ")}` : "");
  if (missing.length) {
    console.log("      The schema is created on the first request that touches the database.");
    console.log("      Visit /verify/ANY on the deployment, then run this again.");
  }

  if (!missing.length) {
    console.log("\nrows");
    for (const t of EXPECTED) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
      console.log(`      ${t.padEnd(20)} ${String(rows[0].c).padStart(6)}`);
    }

    console.log("\nintegrity");
    const orphan = async (label, sql) => {
      const { rows } = await pool.query(sql);
      ok(label, rows[0].c === 0, rows[0].c ? `${rows[0].c} orphaned` : "");
    };
    await orphan("cpd entries all belong to a user",
      "SELECT COUNT(*)::int AS c FROM cpd_entries e LEFT JOIN users u ON u.id=e.user_id WHERE u.id IS NULL");
    await orphan("signatures all belong to a register",
      "SELECT COUNT(*)::int AS c FROM signatures s LEFT JOIN registers r ON r.id=s.register_id WHERE r.id IS NULL");
    await orphan("sessions all belong to a user",
      "SELECT COUNT(*)::int AS c FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE u.id IS NULL");

    // Writes are what actually break on a misconfigured host, so prove one.
    console.log("\nwrite");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const probe = `db-check-${Date.now()}`;
      const ins = await client.query(
        "INSERT INTO auth_attempts (key, attempted_at) VALUES ($1, $2) RETURNING id",
        [probe, new Date().toISOString()]
      );
      ok("insert inside a transaction", !!ins.rows[0]?.id);
      await client.query("ROLLBACK");
      const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM auth_attempts WHERE key=$1", [probe]);
      ok("rollback discards it", rows[0].c === 0);
    } finally {
      client.release();
    }
  }
} catch (error) {
  ok("connects", false, error.message);
  if (/password|authentication/i.test(error.message)) {
    console.log("      Check the password in DATABASE_URL — Supabase shows it once at project creation.");
  }
  if (/timeout|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
    console.log("      Host unreachable. A free Supabase project pauses after about a week idle;");
    console.log("      open its dashboard to wake it.");
  }
} finally {
  await pool.end();
}

console.log(`\n${problems === 0 ? "All checks passed." : `${problems} problem(s).`}`);
process.exit(problems ? 1 : 0);
