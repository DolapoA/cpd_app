import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

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
  created_at TEXT NOT NULL
);

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

/** Idempotent schema updates for databases created before a column existed. */
function migrate(db: Database.Database): void {
  const registerColumns = db.prepare("PRAGMA table_info(registers)").all() as { name: string }[];
  if (!registerColumns.some((c) => c.name === "feedback_enabled")) {
    db.exec("ALTER TABLE registers ADD COLUMN feedback_enabled INTEGER NOT NULL DEFAULT 0");
  }

  const signatureColumns = db.prepare("PRAGMA table_info(signatures)").all() as { name: string }[];
  if (!signatureColumns.some((c) => c.name === "feedback_given")) {
    db.exec("ALTER TABLE signatures ADD COLUMN feedback_given INTEGER NOT NULL DEFAULT 0");
  }

  // A register is other attendees' evidence, so it has to survive its
  // organiser closing their account. That means organiser_id must be
  // nullable, which in SQLite means rebuilding the table.
  const organiserCol = (
    db.prepare("PRAGMA table_info(registers)").all() as { name: string; notnull: number }[]
  ).find((c) => c.name === "organiser_id");
  if (organiserCol?.notnull === 1) {
    const before = (db.prepare("SELECT COUNT(*) AS c FROM registers").get() as { c: number }).c;
    db.pragma("foreign_keys = OFF");
    db.exec(`
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
    db.pragma("foreign_keys = ON");
    const after = (db.prepare("SELECT COUNT(*) AS c FROM registers").get() as { c: number }).c;
    if (before !== after) {
      throw new Error(`Register rebuild lost rows: ${before} before, ${after} after`);
    }
  }

  const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some((c) => c.name === "backup_email")) {
    db.exec("ALTER TABLE users ADD COLUMN backup_email TEXT");
  }
  if (!userColumns.some((c) => c.name === "registration_date")) {
    db.exec("ALTER TABLE users ADD COLUMN registration_date TEXT");
  }
  // Superseded by per-activity-type goals in activity_type_goals.
  if (userColumns.some((c) => c.name === "mix_goal_date")) {
    db.exec("ALTER TABLE users DROP COLUMN mix_goal_date");
  }

  const entryColumns = db.prepare("PRAGMA table_info(cpd_entries)").all() as { name: string }[];
  if (!entryColumns.some((c) => c.name === "standards")) {
    db.exec("ALTER TABLE cpd_entries ADD COLUMN standards TEXT");
  }

  // An early build of this table linked each response to its signature. Drop
  // that shape rather than carry it: it only ever held pre-release test rows,
  // and keeping the link would defeat the anonymity promised on the form.
  const feedbackColumns = db.prepare("PRAGMA table_info(feedback_responses)").all() as {
    name: string;
  }[];
  if (feedbackColumns.some((c) => c.name === "signature_id")) {
    db.exec("DROP TABLE feedback_responses");
    db.exec(`
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

function createDb(): Database.Database {
  const file = process.env.CPD_DB_PATH ?? path.join(process.cwd(), "data", "cpd.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

const globalForDb = globalThis as unknown as { __cpdDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__cpdDb) {
    globalForDb.__cpdDb = createDb();
  }
  return globalForDb.__cpdDb;
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
