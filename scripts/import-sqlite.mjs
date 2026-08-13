/**
 * One-off: copy an existing SQLite database into Postgres.
 *
 *   npx tsx --version >/dev/null 2>&1   # not needed; this is plain node
 *   node scripts/import-sqlite.mjs data/cpd.db "$DATABASE_URL"
 *
 * Safe to run against an empty database. It refuses to run against one that
 * already holds users, because merging two sets of auto-generated ids would
 * silently attach records to the wrong people.
 *
 * Requires better-sqlite3 to read the source file:
 *   npm i -D better-sqlite3
 */
import pg from "pg";

const [, , sourcePath, target] = process.argv;
if (!sourcePath || !target) {
  console.error("usage: node scripts/import-sqlite.mjs <path/to/cpd.db> <postgres-url>");
  process.exit(1);
}

let Database;
try {
  ({ default: Database } = await import("better-sqlite3"));
} catch {
  console.error("better-sqlite3 is needed to read the source file: npm i -D better-sqlite3");
  process.exit(1);
}

const src = new Database(sourcePath, { readonly: true });
const pool = new pg.Pool({
  connectionString: target,
  ssl: /localhost|127\.0\.0\.1/.test(target) ? undefined : { rejectUnauthorized: false },
});

// Parents before children, so foreign keys are satisfiable as we go.
const TABLES = [
  "users",
  "registers",
  "signatures",
  "cpd_entries",
  "feedback_responses",
  "activity_type_goals",
  "sessions",
];

const client = await pool.connect();
try {
  const existing = await client.query("SELECT COUNT(*)::int AS c FROM users");
  if (existing.rows[0].c > 0) {
    console.error(
      `Refusing to import: the target already has ${existing.rows[0].c} users. ` +
        "Import into an empty database, or clear it first."
    );
    process.exit(1);
  }

  await client.query("BEGIN");
  for (const table of TABLES) {
    let rows;
    try {
      rows = src.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      console.log(`  ${table}: not present in the source, skipped`);
      continue;
    }
    if (rows.length === 0) {
      console.log(`  ${table}: empty`);
      continue;
    }
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
    // OVERRIDING SYSTEM VALUE lets the original ids through an IDENTITY column,
    // which is what keeps every foreign key pointing where it did.
    const withOverride = columns.includes("id")
      ? sql.replace("VALUES", "OVERRIDING SYSTEM VALUE VALUES")
      : sql;
    for (const row of rows) await client.query(withOverride, columns.map((c) => row[c]));
    console.log(`  ${table}: ${rows.length}`);
  }

  // Identity sequences still start at 1 after explicit ids were inserted.
  for (const table of TABLES) {
    const hasId = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'id'",
      [table]
    );
    if (hasId.rowCount) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
      );
    }
  }

  await client.query("COMMIT");
  console.log("\nImported. Sequences advanced past the imported ids.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("\nImport failed and was rolled back:", error.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
  src.close();
}
