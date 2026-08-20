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
  /* Zero means "no target", which is the honest default: most regulators set
     no number, and a figure nobody chose is not a target. */
  annual_target_points DOUBLE PRECISION NOT NULL DEFAULT 0,
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
  /* Set when the day-before email went out, so a retry or a second cron run
     in the same day cannot send it twice. */
  reminded_at TEXT,
  /* NULL while still ahead; 'recorded' or 'missed' once answered for. */
  outcome TEXT,
  cpd_entry_id INTEGER REFERENCES cpd_entries(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_planned_user ON planned_events(user_id, starts_on);

/*
  Where somebody has worked, and when.

  Kept apart from the profile's single "role / grade" field, which is only ever
  the current one: an appraisal or an audit covers a period, and a period can
  span two employers. Months rather than days, because that is the precision
  anybody actually remembers and the precision every CV uses.

  ended_on NULL means "still there", which is a state rather than a date and
  cannot be faked with a far-future one without lying in the data.
*/
CREATE TABLE IF NOT EXISTS employments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employer TEXT NOT NULL,
  job_title TEXT,
  /* YYYY-MM, which sorts correctly as a string. */
  started_on TEXT NOT NULL,
  ended_on TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employments_user ON employments(user_id, started_on);

/*
  A browser's permission to send this person a notification.

  One row per device, not per person: someone signs in on a phone and a laptop
  and only the phone is worth interrupting. The endpoint is the address the
  push service gave us and is unique by definition, so re-subscribing the same
  device updates rather than duplicates.

  Keys are the device's, not ours — a payload is encrypted to them, so a
  leaked database yields no readable notifications, only the ability to send.
*/
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  /* What the person would call this device, so a list of them is legible. */
  label TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

/*
  Which shared events a person has already been told about.

  Keyed by the same group key the discover list uses, so "two colleagues are
  going to this" is said once and not again every hour until they answer.
*/
CREATE TABLE IF NOT EXISTS notified_events (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  notified_at TEXT NOT NULL,
  PRIMARY KEY (user_id, event_key)
);

CREATE TABLE IF NOT EXISTS activity_type_goals (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  target_date TEXT NOT NULL,
  UNIQUE(user_id, activity_type)
);
`;

/*
  Idempotent schema updates for databases created before a column existed.

  Postgres can add a column conditionally, so there is no need to inspect the
  catalogue first the way SQLite required.
*/
const MIGRATIONS = `
ALTER TABLE registers ADD COLUMN IF NOT EXISTS feedback_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS feedback_given INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_email_verified_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_confirmed_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discover_events INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_hidden_at TEXT;
/* Existing rows keep whatever they hold; only new accounts start at zero. */
ALTER TABLE users ALTER COLUMN annual_target_points SET DEFAULT 0;
ALTER TABLE planned_events ADD COLUMN IF NOT EXISTS is_public INTEGER NOT NULL DEFAULT 0;
ALTER TABLE planned_events ADD COLUMN IF NOT EXISTS shared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE planned_events ADD COLUMN IF NOT EXISTS reminded_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_calendar_token ON users(calendar_token);
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_date TEXT;
ALTER TABLE cpd_entries ADD COLUMN IF NOT EXISTS standards TEXT;
/* A register is other attendees' evidence, so it survives its organiser
   closing their account. On Postgres this is a plain constraint drop rather
   than the table rebuild SQLite needed. */
ALTER TABLE registers ALTER COLUMN organiser_id DROP NOT NULL;
/* Notifications. All three default on, because someone who has gone as far as
   granting the permission has already said what they want; the switches exist
   to turn things off, not to make them ask twice. The hour is UK local and is
   when everything for that person is delivered — one time of day the app is
   allowed to speak, rather than three. */
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_events INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_target INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_shared INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_hour INTEGER NOT NULL DEFAULT 8;
/* The month a target notification last went out, so it stays monthly. */
ALTER TABLE users ADD COLUMN IF NOT EXISTS notified_target_month TEXT;
/* Separate from reminded_at, which is the day-before email: the two channels
   are answered separately and one failing must not silence the other. */
ALTER TABLE planned_events ADD COLUMN IF NOT EXISTS notified_at TEXT;

/* ---------------------------------------------------------------------------
   TEMPORARY — user acceptance testing only. Delete after acceptance.

   Where the standalone UAT form (kept outside this repository) posts its
   results, via /api/uat. Every submission is also emailed, so this table is
   only the copy that survives a bad address or a Resend outage — testers walk
   through the script once and re-running it is expensive, so a submission is
   never allowed to depend on the mail going out.

   Kept in MIGRATIONS rather than SCHEMA so removing the feature is one deleted
   block here, plus:  DROP TABLE uat_submissions;
   It references no other table, so nothing else breaks when it goes.
--------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS uat_submissions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submitted_at TEXT NOT NULL,
  tester_name TEXT,
  role TEXT,
  profession TEXT,
  device TEXT,
  browser TEXT,
  test_date TEXT,
  verdict TEXT,
  pass_count INTEGER,
  fail_count INTEGER,
  blocked_count INTEGER,
  untested_count INTEGER,
  total_count INTEGER,
  /* The whole per-case array as sent. Held whole rather than shredded into a
     row per case: the script changes between rounds of testing, and a shape
     that has to be migrated is the wrong shape for something being deleted in
     a fortnight. */
  results JSONB,
  user_agent TEXT
);
`;

/**
 * Schema and migrations, once per process — and in one round trip.
 *
 * These used to be twenty-one separate awaited queries. That is nothing when
 * the database is on the same machine, and it is most of a second when it is
 * not: a serverless instance starts cold, and the first person to arrive paid
 * twenty-one network round trips before their first page could begin.
 *
 * Sent as one string, node-postgres uses the simple query protocol: one trip,
 * and Postgres wraps the lot in an implicit transaction, so a database is
 * never left half-migrated by a connection dropping partway through.
 */
async function initialise(p: Pool): Promise<void> {
  await p.query(SCHEMA + MIGRATIONS);
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
      // Sized to the widest fan-out a single page makes — the dashboard asks
      // four questions at once — and no wider. A pool smaller than that turns
      // a parallel page back into a serial one; a pool larger holds
      // connections the database could be giving to another instance.
      max: Number(process.env.PGPOOL_MAX ?? 5),
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
  // Memoised so schema work happens once per process — but a *failed* attempt
  // must not be memoised too. Caching a rejected promise here would take one
  // bad moment (a dropped connection during boot, a lock held elsewhere) and
  // turn it into every request from that instance failing until it is recycled.
  if (!globalForDb.__cpdReady) {
    globalForDb.__cpdReady = initialise(p).catch((error) => {
      globalForDb.__cpdReady = undefined;
      throw error;
    });
  }
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
  notify_events: number;
  notify_target: number;
  notify_shared: number;
  notify_hour: number;
  notified_target_month: string | null;
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

export type Employment = {
  id: number;
  user_id: number;
  employer: string;
  job_title: string | null;
  /** YYYY-MM. */
  started_on: string;
  /** YYYY-MM, or null while it is still current. */
  ended_on: string | null;
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
  reminded_at: string | null;
  notified_at: string | null;
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
