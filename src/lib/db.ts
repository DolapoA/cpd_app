import { Pool, type PoolClient } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  profession TEXT,
  regulator TEXT,
  registration_number TEXT,
  role_grade TEXT,
  registration_date TEXT,
  annual_target_points DOUBLE PRECISION NOT NULL DEFAULT 50,
  backup_email TEXT,
  /* A recovery address can receive password-reset links, which makes it a way
     into the account — so it counts for nothing until its owner proves it. */
  backup_email_verified_at TEXT,
  email_verified_at TEXT,
  /* Base32 TOTP secret. Present once setup has begun; only trusted once
     totp_confirmed_at is set, so an abandoned setup cannot lock anyone out. */
  totp_secret TEXT,
  totp_confirmed_at TEXT,
  /* The secret in a calendar subscription URL. A calendar app cannot send a
     cookie, so the address itself is the credential — hence a random token
     that can be replaced without touching the password. */
  calendar_token TEXT UNIQUE,
  /* Whether they see what others in their profession have shared. On by
     default: an empty listing teaches nobody that the feature exists. */
  discover_events INTEGER NOT NULL DEFAULT 1,
  /* Set when someone hides the setup prompt. A first-run nudge that cannot be
     put away stops being a nudge and becomes furniture. */
  setup_hidden_at TEXT,
  created_at TEXT NOT NULL
);

/*
  Single-use recovery codes, stored hashed for the same reason passwords are:
  they are a full second factor, and a leaked database should not hand over
  working ones. Without these, losing a phone means losing the account.
*/
CREATE TABLE IF NOT EXISTS recovery_codes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes(user_id);

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
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  points DOUBLE PRECISION,
  hours DOUBLE PRECISION,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  access_code TEXT,
  closed_manually INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signatures (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  signature_id INTEGER REFERENCES signatures(id),
  title TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  is_official INTEGER NOT NULL DEFAULT 0,
  points DOUBLE PRECISION,
  hours DOUBLE PRECISION,
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
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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

/*
  CPD someone intends to do, as opposed to CPD they have done. Deliberately a
  separate table from cpd_entries rather than a flag on it: an intention is not
  evidence, and an audit pack that could contain plans nobody attended would be
  worth less than one that cannot.
*/
CREATE TABLE IF NOT EXISTS planned_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  /* Conferences run for days; a single date would misrepresent them. */
  ends_on TEXT,
  /* Both null means an all-day entry, which is what most people know first. */
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  provider TEXT,
  url TEXT,
  notes TEXT,
  expected_points DOUBLE PRECISION,
  expected_hours DOUBLE PRECISION,
  /* Bumped on every edit. Subscribed calendars use it to notice a change:
     without it a moved conference silently keeps its old slot. */
  revision INTEGER NOT NULL DEFAULT 0,
  /* Two separate questions. is_public is a fact about the event — anyone may
     attend, as opposed to a team meeting. shared is the owner's choice to let
     it be seen. Only a public event can be shared, but a public event does not
     have to be. */
  is_public INTEGER NOT NULL DEFAULT 0,
  shared INTEGER NOT NULL DEFAULT 0,
  /* NULL while still ahead; 'recorded' or 'missed' once answered for. */
  outcome TEXT,
  cpd_entry_id INTEGER REFERENCES cpd_entries(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_planned_user ON planned_events(user_id, starts_on);

CREATE TABLE IF NOT EXISTS activity_type_goals (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  target_date TEXT NOT NULL,
  UNIQUE(user_id, activity_type)
);
`;

/** Schema and migrations run once per process, not once per request. */
async function initialise(p: Pool): Promise<void> {
  await p.query(SCHEMA);
  await migrate(p);
}

/** Idempotent schema updates for databases created before a column existed. */
async function migrate(p: Pool): Promise<void> {
  // Postgres can add a column conditionally, so there is no need to inspect
  // the catalogue first the way SQLite required.
  await p.query("ALTER TABLE registers ADD COLUMN IF NOT EXISTS feedback_enabled INTEGER NOT NULL DEFAULT 0");
  await p.query("ALTER TABLE signatures ADD COLUMN IF NOT EXISTS feedback_given INTEGER NOT NULL DEFAULT 0");
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_email TEXT");
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TEXT");
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_email_verified_at TEXT");
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT");
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_confirmed_at TEXT");
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_token TEXT");
  await p.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS discover_events INTEGER NOT NULL DEFAULT 1"
  );
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_hidden_at TEXT");
  await p.query(
    "ALTER TABLE planned_events ADD COLUMN IF NOT EXISTS is_public INTEGER NOT NULL DEFAULT 0"
  );
  await p.query(
    "ALTER TABLE planned_events ADD COLUMN IF NOT EXISTS shared INTEGER NOT NULL DEFAULT 0"
  );
  await p.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_calendar_token ON users(calendar_token)"
  );
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_date TEXT");
  await p.query("ALTER TABLE cpd_entries ADD COLUMN IF NOT EXISTS standards TEXT");

  // A register is other attendees' evidence, so it survives its organiser
  // closing their account. On Postgres this is a plain constraint drop rather
  // than the table rebuild SQLite needed.
  await p.query("ALTER TABLE registers ALTER COLUMN organiser_id DROP NOT NULL");
}

/* ---------------------------------------------------------------------------
   Database access

   Supabase-hosted Postgres, reached with node-postgres. The app owns its own
   sessions and password hashing, so Supabase is used purely as the database —
   no PostgREST, no Supabase Auth — which keeps every query server-side behind
   an existing session check rather than relying on row-level security.

   Statements are written with `?` placeholders and converted to Postgres's
   $1..$n here. That keeps the SQL in the rest of the app in one dialect-neutral
   style and means the call sites did not change when the database did.
--------------------------------------------------------------------------- */

export type RunResult = { changes: number };

export interface Statement {
  get<T>(...args: unknown[]): Promise<T | undefined>;
  all<T>(...args: unknown[]): Promise<T[]>;
  run(...args: unknown[]): Promise<RunResult>;
}

export interface Queryable {
  prepare(sql: string): Statement;
}

export interface Db extends Queryable {
  /** Runs several statements atomically; rolls back if the callback throws. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

/**
 * `?` -> `$1, $2, ...`, skipping anything inside a quoted string so a literal
 * question mark in text cannot be mistaken for a placeholder.
 */
export function toPositional(sql: string): string {
  let out = "";
  let n = 0;
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      out += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      out += c;
      continue;
    }
    out += c === "?" ? `$${++n}` : c;
  }
  return out;
}

type Runner = (sql: string, args: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;

function statement(run: Runner, sql: string): Statement {
  const text = toPositional(sql);
  return {
    async get<T>(...args: unknown[]) {
      return (await run(text, args)).rows[0] as T | undefined;
    },
    async all<T>(...args: unknown[]) {
      return (await run(text, args)).rows as T[];
    },
    async run(...args: unknown[]) {
      const r = await run(text, args);
      return { changes: r.rowCount ?? 0 };
    },
  };
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres " +
        "(Supabase: Project settings -> Database -> Connection string -> Transaction pooler)."
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as { __cpdPool?: Pool; __cpdReady?: Promise<void> };

function pool(): Pool {
  if (!globalForDb.__cpdPool) {
    const url = connectionString();
    globalForDb.__cpdPool = new Pool({
      connectionString: url,
      // A serverless instance handles one request at a time, so a large pool
      // just holds connections the database could give to another instance.
      max: Number(process.env.PGPOOL_MAX ?? 3),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      // Supabase terminates TLS with its own chain; verification is off for the
      // pooler host, which is standard for these connection strings.
      ssl: url.includes("localhost") || url.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false },
    });
  }
  return globalForDb.__cpdPool;
}

export async function getDb(): Promise<Db> {
  const p = pool();
  if (!globalForDb.__cpdReady) globalForDb.__cpdReady = initialise(p);
  await globalForDb.__cpdReady;

  const runOnPool: Runner = (sql, args) => p.query(sql, args);

  return {
    prepare: (sql) => statement(runOnPool, sql),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      const client: PoolClient = await p.connect();
      try {
        await client.query("BEGIN");
        const runOnClient: Runner = (sql, args) => client.query(sql, args);
        const result = await fn({ prepare: (sql) => statement(runOnClient, sql) });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
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
  /** Until this is set, the recovery address is a note to us, not a way in. */
  backup_email_verified_at: string | null;
  calendar_token: string | null;
  discover_events: number;
  setup_hidden_at: string | null;
  totp_secret: string | null;
  /** Set only when a first code has been verified — until then 2FA is not on. */
  totp_confirmed_at: string | null;
  created_at: string;
};

export type PlannedEvent = {
  id: number;
  user_id: number;
  title: string;
  starts_on: string;
  ends_on: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  provider: string | null;
  url: string | null;
  notes: string | null;
  expected_points: number | null;
  expected_hours: number | null;
  revision: number;
  is_public: number;
  shared: number;
  outcome: string | null;
  cpd_entry_id: number | null;
  created_at: string;
  updated_at: string;
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
