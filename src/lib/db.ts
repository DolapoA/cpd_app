import { createClient, type Client, type InValue, type Transaction } from "@libsql/client";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  profession TEXT,
  regulator TEXT,
  registration_number TEXT,
  role_grade TEXT,
  registration_date TEXT,
  annual_target_points REAL NOT NULL DEFAULT 50,
  backup_email TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);

/*
  Single-use tokens for password reset and email confirmation. Stored hashed:
  a leaked database should not hand over working reset links, for the same
  reason passwords are not stored in the clear.
*/
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, purpose);

/* Failed sign-in attempts, for rate limiting. Keyed by email so one account
   cannot be ground down, and pruned as it is read. */
CREATE TABLE IF NOT EXISTS auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_key ON auth_attempts(key, attempted_at);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  organiser_id INTEGER REFERENCES users(id),
  organiser_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  event_type TEXT NOT NULL,
  is_official INTEGER NOT NULL DEFAULT 0,
  accrediting_body TEXT,
  points REAL,
  hours REAL,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  access_code TEXT,
  closed_manually INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  register_id INTEGER NOT NULL REFERENCES registers(id),
  user_id INTEGER REFERENCES users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  professional_body TEXT,
  registration_number TEXT,
  role_grade TEXT,
  signed_at TEXT NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  voided INTEGER NOT NULL DEFAULT 0,
  void_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_signatures_register ON signatures(register_id);
CREATE INDEX IF NOT EXISTS idx_signatures_email ON signatures(email);

CREATE TABLE IF NOT EXISTS cpd_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  signature_id INTEGER REFERENCES signatures(id),
  title TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  is_official INTEGER NOT NULL DEFAULT 0,
  points REAL,
  hours REAL,
  provider TEXT,
  notes TEXT,
  standards TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cpd_entries_user ON cpd_entries(user_id);

/*
  Feedback deliberately holds no reference to the signature or attendee that
  produced it — not merely an undisplayed one, so that "the organiser sees the
  answers, not who gave them" stays true against a data breach or a subpoena,
  not just in the UI. Duplicate submissions are prevented by a flag on the
  signature instead. For the same reason only the date is kept: a precise
  timestamp could be lined up against sign-in times to re-identify a respondent.
*/
CREATE TABLE IF NOT EXISTS feedback_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  register_id INTEGER NOT NULL REFERENCES registers(id),
  question_set_version INTEGER NOT NULL DEFAULT 1,
  q1 INTEGER NOT NULL,
  q2 INTEGER NOT NULL,
  q3 INTEGER NOT NULL,
  q4 INTEGER NOT NULL,
  q5 INTEGER NOT NULL,
  comments TEXT,
  submitted_on TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_register ON feedback_responses(register_id);

CREATE TABLE IF NOT EXISTS activity_type_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  target_date TEXT NOT NULL,
  UNIQUE(user_id, activity_type)
);
`;

/** SCHEMA and the rebuild below are multi-statement; libSQL executes one at a time. */
async function execMany(client: Client, sql: string): Promise<void> {
  for (const statement of sql.split(";")) {
    const trimmed = statement.trim();
    if (trimmed) await client.execute(trimmed);
  }
}

/** Idempotent schema updates for databases created before a column existed. */
async function migrate(client: Client): Promise<void> {
  const registerColumns = (await client.execute("PRAGMA table_info(registers)")).rows as unknown as { name: string }[];
  if (!registerColumns.some((c) => c.name === "feedback_enabled")) {
    await client.execute("ALTER TABLE registers ADD COLUMN feedback_enabled INTEGER NOT NULL DEFAULT 0");
  }

  const signatureColumns = (await client.execute("PRAGMA table_info(signatures)")).rows as unknown as { name: string }[];
  if (!signatureColumns.some((c) => c.name === "feedback_given")) {
    await client.execute("ALTER TABLE signatures ADD COLUMN feedback_given INTEGER NOT NULL DEFAULT 0");
  }

  // A register is other attendees' evidence, so it has to survive its
  // organiser closing their account. That means organiser_id must be
  // nullable, which in SQLite means rebuilding the table.
  const organiserCol = (
    (await client.execute("PRAGMA table_info(registers)")).rows as unknown as { name: string; notnull: number }[]
  ).find((c) => c.name === "organiser_id");
  if (organiserCol?.notnull === 1) {
    const before = Number(((await client.execute("SELECT COUNT(*) AS c FROM registers")).rows[0] as unknown as { c: number }).c);
    await client.execute("PRAGMA foreign_keys = OFF");
    await execMany(client, `
      CREATE TABLE registers_rebuilt (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        organiser_id INTEGER REFERENCES users(id),
        organiser_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT,
        event_type TEXT NOT NULL,
        is_official INTEGER NOT NULL DEFAULT 0,
        accrediting_body TEXT,
        points REAL,
        hours REAL,
        opens_at TEXT NOT NULL,
        closes_at TEXT NOT NULL,
        access_code TEXT,
        closed_manually INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        feedback_enabled INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO registers_rebuilt
        SELECT id, code, organiser_id, organiser_name, title, description, event_date,
               start_time, end_time, location, event_type, is_official, accrediting_body,
               points, hours, opens_at, closes_at, access_code, closed_manually, created_at,
               feedback_enabled
        FROM registers;
      DROP TABLE registers;
      ALTER TABLE registers_rebuilt RENAME TO registers;
    `);
    await client.execute("PRAGMA foreign_keys = ON");
    const after = Number(((await client.execute("SELECT COUNT(*) AS c FROM registers")).rows[0] as unknown as { c: number }).c);
    if (before !== after) {
      throw new Error(`Register rebuild lost rows: ${before} before, ${after} after`);
    }
  }

  const userColumns = (await client.execute("PRAGMA table_info(users)")).rows as unknown as { name: string }[];
  if (!userColumns.some((c) => c.name === "backup_email")) {
    await client.execute("ALTER TABLE users ADD COLUMN backup_email TEXT");
  }
  if (!userColumns.some((c) => c.name === "email_verified_at")) {
    await client.execute("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
  }
  if (!userColumns.some((c) => c.name === "registration_date")) {
    await client.execute("ALTER TABLE users ADD COLUMN registration_date TEXT");
  }
  // Superseded by per-activity-type goals in activity_type_goals.
  if (userColumns.some((c) => c.name === "mix_goal_date")) {
    await client.execute("ALTER TABLE users DROP COLUMN mix_goal_date");
  }

  const entryColumns = (await client.execute("PRAGMA table_info(cpd_entries)")).rows as unknown as { name: string }[];
  if (!entryColumns.some((c) => c.name === "standards")) {
    await client.execute("ALTER TABLE cpd_entries ADD COLUMN standards TEXT");
  }

  // An early build of this table linked each response to its signature. Drop
  // that shape rather than carry it: it only ever held pre-release test rows,
  // and keeping the link would defeat the anonymity promised on the form.
  const feedbackColumns = (await client.execute("PRAGMA table_info(feedback_responses)"))
    .rows as unknown as { name: string }[];
  if (feedbackColumns.some((c) => c.name === "signature_id")) {
    await client.execute("DROP TABLE feedback_responses");
    await execMany(client, `
      CREATE TABLE feedback_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        register_id INTEGER NOT NULL REFERENCES registers(id),
        question_set_version INTEGER NOT NULL DEFAULT 1,
        q1 INTEGER NOT NULL,
        q2 INTEGER NOT NULL,
        q3 INTEGER NOT NULL,
        q4 INTEGER NOT NULL,
        q5 INTEGER NOT NULL,
        comments TEXT,
        submitted_on TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_register ON feedback_responses(register_id);
    `);
  }
}

/* ---------------------------------------------------------------------------
   Database access

   libSQL rather than a local SQLite file, because the deployment target has a
   read-only, ephemeral filesystem: a file database there would fail on write
   and vanish on every cold start. The SQL is unchanged — libSQL is SQLite —
   so what differs is only that calls are now asynchronous.

   The shape below deliberately mirrors better-sqlite3's prepare().get/all/run,
   so call sites read the same as before and simply await.

   Local development uses the same client against a file: URL, so there is one
   code path rather than one for development and another for production.
--------------------------------------------------------------------------- */

export type RunResult = { lastInsertRowid: number; changes: number };

export interface Statement {
  get<T>(...args: InValue[]): Promise<T | undefined>;
  all<T>(...args: InValue[]): Promise<T[]>;
  run(...args: InValue[]): Promise<RunResult>;
}

export interface Queryable {
  prepare(sql: string): Statement;
}

export interface Db extends Queryable {
  /** Runs several statements atomically; rolls back if the callback throws. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

function statement(run: (sql: string, args: InValue[]) => Promise<{
  rows: unknown[];
  lastInsertRowid?: bigint;
  rowsAffected: number;
}>, sql: string): Statement {
  return {
    async get<T>(...args: InValue[]) {
      const rs = await run(sql, args);
      return rs.rows[0] as unknown as T | undefined;
    },
    async all<T>(...args: InValue[]) {
      const rs = await run(sql, args);
      return rs.rows as unknown as T[];
    },
    async run(...args: InValue[]) {
      const rs = await run(sql, args);
      return {
        // libSQL returns a bigint; every id in this schema is well inside
        // Number's safe range, and the rest of the code expects a number.
        lastInsertRowid: rs.lastInsertRowid === undefined ? 0 : Number(rs.lastInsertRowid),
        changes: rs.rowsAffected,
      };
    },
  };
}

function wrap(client: Client): Queryable {
  return { prepare: (sql) => statement((s, args) => client.execute({ sql: s, args }), sql) };
}

function wrapTx(tx: Transaction): Queryable {
  return { prepare: (sql) => statement((s, args) => tx.execute({ sql: s, args }), sql) };
}

function createClientFromEnv(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? `file:${process.env.CPD_DB_PATH ?? "data/cpd.db"}`;
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

/** Schema and migrations run once per process, not once per request. */
async function initialise(client: Client): Promise<void> {
  // Only meaningful against a local file; a remote database manages its own.
  if (!process.env.TURSO_DATABASE_URL) {
    await client.execute("PRAGMA journal_mode = WAL");
  }
  await client.execute("PRAGMA foreign_keys = ON");
  for (const stmt of SCHEMA.split(";")) {
    const sql = stmt.trim();
    if (sql) await client.execute(sql);
  }
  await migrate(client);
}

const globalForDb = globalThis as unknown as {
  __cpdClient?: Client;
  __cpdReady?: Promise<void>;
};

export async function getDb(): Promise<Db> {
  if (!globalForDb.__cpdClient) {
    globalForDb.__cpdClient = createClientFromEnv();
    globalForDb.__cpdReady = initialise(globalForDb.__cpdClient);
  }
  await globalForDb.__cpdReady;
  const client = globalForDb.__cpdClient;

  return {
    ...wrap(client),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      const tx = await client.transaction("write");
      try {
        const result = await fn(wrapTx(tx));
        await tx.commit();
        return result;
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },
  };
}

export type User = {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  profession: string | null;
  regulator: string | null;
  registration_number: string | null;
  role_grade: string | null;
  /** When the user joined their regulator's register (YYYY-MM-DD); CPD before
   *  this date cannot count toward their registration. */
  registration_date: string | null;
  annual_target_points: number;
  backup_email: string | null;
  /** Set once the address has been confirmed by following an emailed link. */
  email_verified_at: string | null;
  created_at: string;
};

export type ActivityTypeGoal = {
  id: number;
  user_id: number;
  activity_type: string;
  target_date: string;
};

export type Register = {
  id: number;
  code: string;
  organiser_id: number | null;
  organiser_name: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  event_type: string;
  is_official: number;
  accrediting_body: string | null;
  points: number | null;
  hours: number | null;
  opens_at: string;
  closes_at: string;
  access_code: string | null;
  closed_manually: number;
  feedback_enabled: number;
  created_at: string;
};

export type FeedbackResponse = {
  id: number;
  register_id: number;
  question_set_version: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  comments: string | null;
  submitted_on: string;
};

export type Signature = {
  id: number;
  register_id: number;
  user_id: number | null;
  full_name: string;
  email: string;
  professional_body: string | null;
  registration_number: string | null;
  role_grade: string | null;
  signed_at: string;
  verification_code: string;
  voided: number;
  void_reason: string | null;
  feedback_given: number;
};

export type CpdEntry = {
  id: number;
  user_id: number;
  signature_id: number | null;
  title: string;
  activity_date: string;
  activity_type: string;
  is_official: number;
  points: number | null;
  hours: number | null;
  provider: string | null;
  notes: string | null;
  /** Comma-separated framework codes; see lib/standards.ts. */
  standards: string | null;
  verified: number;
  created_at: string;
};

export function registerStatus(reg: Register, now: Date = new Date()) {
  if (reg.closed_manually) return "closed" as const;
  const t = now.toISOString();
  if (t < reg.opens_at) return "not-open" as const;
  if (t > reg.closes_at) return "closed" as const;
  return "open" as const;
}
