"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, registerStatus, type CpdEntry, type Register, type Signature, type User } from "./db";
import { createSession, destroySession, getCurrentUser } from "./auth";
import { forgetGuestSlip, getGuestSlipCode, rememberGuestSlip } from "./guest-signature";
import { newRegisterCode, newVerificationCode } from "./ids";
import { ACTIVITY_TYPES, EVENT_TYPES, REGULATORS } from "./format";
import { mapRows, parseSpreadsheet, type ParsedEntry } from "./import";
import { FEEDBACK_QUESTIONS, QUESTION_SET_VERSION, SCALE_POINTS } from "./feedback";
import { frameworkFor, serialiseStandards, validStandards } from "./standards";

export type ActionState = { error: string } | null;

export type ImportPreviewState =
  | { error: string }
  | { fileName: string; entries: ParsedEntry[]; issues: string[]; totalRows: number }
  | null;

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function num(formData: FormData, key: string): number | null {
  const s = str(formData, key);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, "email").toLowerCase();
  const password = formData.get("password");
  const fullName = str(formData, "full_name");
  const profession = str(formData, "profession");
  const regulator = str(formData, "regulator");
  const registrationNumber = str(formData, "registration_number");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (typeof password !== "string" || password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (!fullName) return { error: "Enter your full name." };
  if (regulator && !(REGULATORS as readonly string[]).includes(regulator))
    return { error: "Choose a valid regulator, or \"Other\" if yours isn't listed." };

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return { error: "An account with that email already exists. Try logging in." };

  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, profession, regulator, registration_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(email, hash, fullName, profession || null, regulator || null, registrationNumber || null, now);
  const userId = Number(result.lastInsertRowid);

  claimGuestSignatures(userId, email, await getGuestSlipCode());
  await forgetGuestSlip();

  await createSession(userId);
  redirect("/dashboard");
}

function claimGuestSignatures(userId: number, email: string, alsoCode?: string | null) {
  const db = getDb();
  const orphans = db
    .prepare(
      `SELECT s.*, r.title, r.event_date, r.is_official, r.points, r.hours, r.organiser_name
       FROM signatures s JOIN registers r ON r.id = s.register_id
       WHERE s.user_id IS NULL AND s.voided = 0 AND (s.email = ? OR s.verification_code = ?)`
    )
    .all(email, alsoCode ?? "") as (Signature & Pick<Register, "title" | "event_date" | "is_official" | "points" | "hours" | "organiser_name">)[];

  const claim = db.prepare("UPDATE signatures SET user_id = ? WHERE id = ?");
  const insertEntry = db.prepare(
    `INSERT INTO cpd_entries (user_id, signature_id, title, activity_date, activity_type, is_official, points, hours, provider, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  );
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const s of orphans) {
      claim.run(userId, s.id);
      insertEntry.run(
        userId,
        s.id,
        s.title,
        s.event_date,
        "Formal / educational",
        s.is_official,
        s.points,
        s.hours,
        s.organiser_name,
        now
      );
    }
  });
  tx();
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, "email").toLowerCase();
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password)
    return { error: "Enter your email and password." };

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return { error: "Email or password is incorrect." };

  // Someone who signed a register as a guest and then logs in should get those
  // slips too — not just people who create an account afterwards.
  claimGuestSignatures(user.id, email, await getGuestSlipCode());
  await forgetGuestSlip();

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const fullName = str(formData, "full_name");
  if (!fullName) return { error: "Enter your full name." };
  const regulator = str(formData, "regulator");
  if (regulator && !(REGULATORS as readonly string[]).includes(regulator))
    return { error: "Choose a valid regulator." };
  const target = num(formData, "annual_target_points");

  const registrationDate = str(formData, "registration_date");
  if (registrationDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(registrationDate) || isNaN(Date.parse(registrationDate)))
      return { error: "Enter your registration date as a valid date." };
    if (registrationDate > new Date().toISOString().slice(0, 10))
      return { error: "Your registration date can’t be in the future." };
  }

  getDb()
    .prepare(
      `UPDATE users SET full_name = ?, profession = ?, regulator = ?, registration_number = ?, role_grade = ?, registration_date = ?, annual_target_points = ?
       WHERE id = ?`
    )
    .run(
      fullName,
      str(formData, "profession") || null,
      regulator || null,
      str(formData, "registration_number") || null,
      str(formData, "role_grade") || null,
      registrationDate || null,
      target ?? 50,
      user.id
    );
  revalidatePath("/", "layout");
  return null;
}

// ---------------------------------------------------------------------------
// Registers (organiser)
// ---------------------------------------------------------------------------

export async function createRegister(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = str(formData, "title");
  const eventDate = str(formData, "event_date");
  const startTime = str(formData, "start_time");
  const endTime = str(formData, "end_time");
  const eventType = str(formData, "event_type");
  const isOfficial = str(formData, "is_official") === "official";
  const accreditingBody = str(formData, "accrediting_body");
  const points = num(formData, "points");
  const hours = num(formData, "hours");
  const closeAfterHours = num(formData, "close_after_hours") ?? 24;

  if (!title) return { error: "Enter an event title." };
  if (!eventDate || !startTime || !endTime) return { error: "Enter the event date, start and end times." };
  if (!(EVENT_TYPES as readonly string[]).includes(eventType)) return { error: "Choose an event type." };
  if (isOfficial && !accreditingBody)
    return { error: "Official CPD events must name the accrediting body." };
  if (isOfficial && points === null)
    return { error: "Official CPD events must state the points/credits awarded." };

  const opensAt = new Date(`${eventDate}T${startTime}`);
  const endsAt = new Date(`${eventDate}T${endTime}`);
  if (isNaN(opensAt.getTime()) || isNaN(endsAt.getTime())) return { error: "Invalid date or time." };
  if (endsAt <= opensAt) return { error: "End time must be after the start time." };
  const closesAt = new Date(endsAt.getTime() + closeAfterHours * 60 * 60 * 1000);

  const db = getDb();
  const code = newRegisterCode();
  const result = db
    .prepare(
      `INSERT INTO registers
        (code, organiser_id, organiser_name, title, description, event_date, start_time, end_time, location,
         event_type, is_official, accrediting_body, points, hours, opens_at, closes_at, access_code,
         feedback_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      code,
      user.id,
      str(formData, "organiser_name") || user.full_name,
      title,
      str(formData, "description") || null,
      eventDate,
      startTime,
      endTime,
      str(formData, "location") || null,
      eventType,
      isOfficial ? 1 : 0,
      isOfficial ? accreditingBody : null,
      isOfficial ? points : null,
      hours,
      opensAt.toISOString(),
      closesAt.toISOString(),
      str(formData, "access_code").toUpperCase() || null,
      str(formData, "collect_feedback") === "yes" ? 1 : 0,
      new Date().toISOString()
    );

  redirect(`/registers/${Number(result.lastInsertRowid)}`);
}

function requireOwnedRegister(user: User, registerId: number): Register {
  const reg = getDb().prepare("SELECT * FROM registers WHERE id = ?").get(registerId) as
    | Register
    | undefined;
  if (!reg || reg.organiser_id !== user.id) {
    throw new Error("Register not found or you are not its organiser.");
  }
  return reg;
}

export async function setRegisterClosed(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const registerId = Number(formData.get("register_id"));
  const closed = str(formData, "closed") === "1";
  requireOwnedRegister(user, registerId);
  getDb().prepare("UPDATE registers SET closed_manually = ? WHERE id = ?").run(closed ? 1 : 0, registerId);
  revalidatePath(`/registers/${registerId}`);
}

export async function setFeedbackEnabled(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const registerId = Number(formData.get("register_id"));
  const enabled = str(formData, "enabled") === "1";
  requireOwnedRegister(user, registerId);
  getDb()
    .prepare("UPDATE registers SET feedback_enabled = ? WHERE id = ?")
    .run(enabled ? 1 : 0, registerId);
  revalidatePath(`/registers/${registerId}`);
}

export async function voidSignature(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const signatureId = Number(formData.get("signature_id"));
  const reason = str(formData, "reason") || "Voided by organiser";

  const db = getDb();
  const sig = db.prepare("SELECT * FROM signatures WHERE id = ?").get(signatureId) as
    | Signature
    | undefined;
  if (!sig) return;
  requireOwnedRegister(user, sig.register_id);

  const tx = db.transaction(() => {
    db.prepare("UPDATE signatures SET voided = 1, void_reason = ? WHERE id = ?").run(reason, signatureId);
    db.prepare("UPDATE cpd_entries SET verified = 0 WHERE signature_id = ?").run(signatureId);
  });
  tx();
  revalidatePath(`/registers/${sig.register_id}`);
}

// ---------------------------------------------------------------------------
// Public signing
// ---------------------------------------------------------------------------

export async function signRegister(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = str(formData, "register_code");
  const db = getDb();
  const reg = db.prepare("SELECT * FROM registers WHERE code = ?").get(code) as Register | undefined;
  if (!reg) return { error: "This register no longer exists." };

  const status = registerStatus(reg);
  if (status === "not-open") return { error: "This register is not open yet. Try again once the event has started." };
  if (status === "closed") return { error: "This register has closed and can no longer be signed." };

  if (reg.access_code) {
    const supplied = str(formData, "access_code").toUpperCase();
    if (supplied !== reg.access_code) return { error: "The access code is incorrect. It was announced at the event." };
  }

  const user = await getCurrentUser();
  const fullName = user ? user.full_name : str(formData, "full_name");
  const email = (user ? user.email : str(formData, "email")).toLowerCase();
  const professionalBody = user ? user.regulator : str(formData, "professional_body") || null;
  const registrationNumber = user ? user.registration_number : str(formData, "registration_number") || null;
  const roleGrade = user ? user.role_grade : str(formData, "role_grade") || null;

  if (!fullName) return { error: "Enter your full name." };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };

  const dup = db
    .prepare("SELECT id FROM signatures WHERE register_id = ? AND email = ? AND voided = 0")
    .get(reg.id, email);
  if (dup) return { error: "This email has already signed the register for this event." };

  const verificationCode = newVerificationCode();
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    const sigResult = db
      .prepare(
        `INSERT INTO signatures
          (register_id, user_id, full_name, email, professional_body, registration_number, role_grade, signed_at, verification_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        reg.id,
        user?.id ?? null,
        fullName,
        email,
        professionalBody,
        registrationNumber,
        roleGrade,
        now,
        verificationCode
      );

    if (user) {
      db.prepare(
        `INSERT INTO cpd_entries (user_id, signature_id, title, activity_date, activity_type, is_official, points, hours, provider, verified, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).run(
        user.id,
        Number(sigResult.lastInsertRowid),
        reg.title,
        reg.event_date,
        "Formal / educational",
        reg.is_official,
        reg.points,
        reg.hours,
        reg.organiser_name,
        now
      );
    }
  });
  tx();

  // Guests only: an account holder's slip is already on their record.
  if (!user) await rememberGuestSlip(verificationCode);

  redirect(`/r/${reg.code}/signed?sig=${verificationCode}`);
}

// ---------------------------------------------------------------------------
// Event feedback
// ---------------------------------------------------------------------------

export async function submitFeedback(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const verificationCode = str(formData, "verification_code");
  const db = getDb();

  const sig = db
    .prepare("SELECT * FROM signatures WHERE verification_code = ?")
    .get(verificationCode) as Signature | undefined;
  if (!sig) return { error: "We could not match that attendance record." };
  if (sig.voided) return { error: "This attendance record has been voided." };

  const reg = db.prepare("SELECT * FROM registers WHERE id = ?").get(sig.register_id) as
    | Register
    | undefined;
  if (!reg || !reg.feedback_enabled)
    return { error: "This event is not collecting feedback." };

  if (sig.feedback_given)
    return { error: "You have already left feedback for this event. Thank you." };

  const ratings: number[] = [];
  for (const question of FEEDBACK_QUESTIONS) {
    const value = num(formData, question.key);
    if (value === null || !Number.isInteger(value) || value < 1 || value > SCALE_POINTS) {
      return { error: "Please answer all five questions." };
    }
    ratings.push(value);
  }

  const comments = str(formData, "comments").slice(0, 4000);
  const keepReflection = str(formData, "keep_reflection") === "yes";

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO feedback_responses
        (register_id, question_set_version, q1, q2, q3, q4, q5, comments, submitted_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      reg.id,
      QUESTION_SET_VERSION,
      ratings[0],
      ratings[1],
      ratings[2],
      ratings[3],
      ratings[4],
      comments || null,
      new Date().toISOString().slice(0, 10)
    );

    // The flag lives on the signature, so a second submission can be refused
    // without the response itself pointing back at anyone.
    db.prepare("UPDATE signatures SET feedback_given = 1 WHERE id = ?").run(sig.id);

    // The attendee's own copy is a different thing from the organiser's
    // anonymous aggregate: it sits on their CPD record, attributed to them,
    // because regulators ask for exactly this reflection.
    if (keepReflection && sig.user_id) {
      const entry = db
        .prepare("SELECT id, notes FROM cpd_entries WHERE signature_id = ? AND user_id = ?")
        .get(sig.id, sig.user_id) as { id: number; notes: string | null } | undefined;
      if (entry) {
        const q2 = FEEDBACK_QUESTIONS[1];
        const q3 = FEEDBACK_QUESTIONS[2];
        const reflection = [
          `${q2.short}: ${q2.labels[ratings[1] - 1]}.`,
          `${q3.short}: ${q3.labels[ratings[2] - 1]}.`,
          comments ? `Notes: ${comments}` : "",
        ]
          .filter(Boolean)
          .join(" ");
        const merged = entry.notes ? `${entry.notes}\n\n${reflection}` : reflection;
        db.prepare("UPDATE cpd_entries SET notes = ? WHERE id = ?").run(
          merged.slice(0, 2000),
          entry.id
        );
      }
    }
  });
  tx();

  redirect(`/r/${reg.code}/signed?sig=${verificationCode}&thanks=1`);
}

// ---------------------------------------------------------------------------
// CPD record
// ---------------------------------------------------------------------------

export async function addManualEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = str(formData, "title");
  const activityDate = str(formData, "activity_date");
  const activityType = str(formData, "activity_type");
  if (!title) return { error: "Enter a title for the activity." };
  if (!activityDate) return { error: "Enter the date of the activity." };
  if (!(ACTIVITY_TYPES as readonly string[]).includes(activityType))
    return { error: "Choose an activity type." };

  const framework = frameworkFor(user.regulator);
  let standards: string | null = null;
  if (framework) {
    const chosen = validStandards(framework, formData.getAll("standards").map(String));
    if (chosen.length === 0)
      return { error: `Choose at least one ${framework.noun} this activity evidences.` };
    standards = serialiseStandards(chosen);
  }

  getDb()
    .prepare(
      `INSERT INTO cpd_entries (user_id, title, activity_date, activity_type, is_official, points, hours, provider, notes, standards, verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      user.id,
      title,
      activityDate,
      activityType,
      str(formData, "is_official") === "official" ? 1 : 0,
      num(formData, "points"),
      num(formData, "hours"),
      str(formData, "provider") || null,
      str(formData, "notes") || null,
      standards,
      new Date().toISOString()
    );

  redirect("/record");
}

/**
 * Tags an existing entry against the user's framework. Permitted on
 * platform-verified entries too: the codes are the user's own classification of
 * their learning, not part of the attendance evidence, so setting them doesn't
 * weaken the immutability that makes verified entries trustworthy.
 */
/**
 * Fills in whatever an entry was missing. Every field is optional so a partial
 * save is allowed — the point is to make finishing a record easy, not to put a
 * second validation wall in front of someone who has already imported.
 * Permitted on platform-verified entries for the same reason as
 * setEntryStandards: none of these fields is part of the attendance evidence.
 */
export async function fillEntryGaps(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const entryId = Number(formData.get("entry_id"));
  const db = getDb();
  const entry = db
    .prepare("SELECT * FROM cpd_entries WHERE id = ? AND user_id = ?")
    .get(entryId, user.id) as CpdEntry | undefined;
  if (!entry) return { error: "That activity is no longer in your record." };

  const notes = str(formData, "notes");
  const hours = num(formData, "hours");
  const activityType = str(formData, "activity_type");
  if (activityType && !(ACTIVITY_TYPES as readonly string[]).includes(activityType))
    return { error: "Choose a valid activity type." };

  const framework = frameworkFor(user.regulator);
  const chosen = framework
    ? validStandards(framework, formData.getAll("standards").map(String))
    : [];

  db.prepare(
    `UPDATE cpd_entries
       SET notes = ?, hours = ?, activity_type = ?, standards = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    notes ? notes.slice(0, 4000) : entry.notes,
    hours ?? entry.hours,
    activityType || entry.activity_type,
    chosen.length ? serialiseStandards(chosen) : entry.standards,
    entryId,
    user.id
  );

  revalidatePath("/record");
  revalidatePath("/record/complete");
  revalidatePath("/dashboard");
  return null;
}

/**
 * Sets a target date for a single activity type, or clears it with a blank
 * date. One goal per type, so saving again replaces the previous target.
 */
export async function setActivityTypeGoal(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activityType = str(formData, "activity_type");
  if (!(ACTIVITY_TYPES as readonly string[]).includes(activityType))
    return { error: "Unknown activity type." };

  const target = str(formData, "target_date");
  const db = getDb();

  if (!target) {
    db.prepare("DELETE FROM activity_type_goals WHERE user_id = ? AND activity_type = ?").run(
      user.id,
      activityType
    );
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || isNaN(Date.parse(target)))
      return { error: "Enter a valid date." };
    if (target < new Date().toISOString().slice(0, 10))
      return { error: "Pick a date in the future." };
    db.prepare(
      `INSERT INTO activity_type_goals (user_id, activity_type, target_date)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, activity_type) DO UPDATE SET target_date = excluded.target_date`
    ).run(user.id, activityType, target);
  }

  revalidatePath("/record/activity-types");
  revalidatePath("/dashboard");
  return null;
}

export async function setEntryStandards(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const framework = frameworkFor(user.regulator);
  if (!framework) return;

  const entryId = Number(formData.get("entry_id"));
  const chosen = validStandards(framework, formData.getAll("standards").map(String));
  if (chosen.length === 0) return;

  getDb()
    .prepare("UPDATE cpd_entries SET standards = ? WHERE id = ? AND user_id = ?")
    .run(serialiseStandards(chosen), entryId, user.id);

  revalidatePath("/record");
  revalidatePath("/record/standards");
  revalidatePath("/dashboard");
}

export async function parseImportFile(
  _prev: ImportPreviewState,
  formData: FormData
): Promise<ImportPreviewState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Choose a CSV or Excel (.xlsx) file to upload." };
  if (file.size > 5 * 1024 * 1024) return { error: "That file is larger than 5 MB. Split it and try again." };

  let rows: string[][];
  try {
    rows = await parseSpreadsheet(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "That file could not be read as a CSV or Excel spreadsheet." };
  }

  const { entries, issues, totalRows } = mapRows(rows);
  if (entries.length === 0) {
    return {
      error:
        "No importable rows were found. " +
        (issues[0] ?? "Check the file matches the expected columns — download the template for an example."),
    };
  }
  return { fileName: file.name, entries, issues, totalRows };
}

export async function commitImport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let entries: ParsedEntry[];
  try {
    entries = JSON.parse(str(formData, "payload"));
    if (!Array.isArray(entries) || entries.length === 0) throw new Error();
  } catch {
    return { error: "The import data was missing or malformed. Upload the file again." };
  }
  if (entries.length > 2000) return { error: "Imports are limited to 2,000 rows at a time." };

  const valid = entries.filter(
    (e) =>
      e &&
      typeof e.title === "string" &&
      e.title.trim() !== "" &&
      typeof e.activity_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.activity_date) &&
      (ACTIVITY_TYPES as readonly string[]).includes(e.activity_type)
  );
  if (valid.length === 0) return { error: "The import data was missing or malformed. Upload the file again." };

  const framework = frameworkFor(user.regulator);
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO cpd_entries (user_id, title, activity_date, activity_type, is_official, points, hours, provider, notes, standards, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  );
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const e of valid) {
      // Codes the sheet supplied are only kept if the user's own framework
      // defines them; anything else is dropped and the entry shows up in the
      // "needs tagging" to-do rather than carrying a meaningless code.
      const standards =
        framework && typeof e.standards === "string"
          ? serialiseStandards(validStandards(framework, e.standards.split(",")))
          : null;
      insert.run(
        user.id,
        e.title.trim().slice(0, 200),
        e.activity_date,
        e.activity_type,
        e.is_official ? 1 : 0,
        typeof e.points === "number" && Number.isFinite(e.points) && e.points >= 0 ? e.points : null,
        typeof e.hours === "number" && Number.isFinite(e.hours) && e.hours >= 0 ? e.hours : null,
        typeof e.provider === "string" && e.provider.trim() !== "" ? e.provider.trim().slice(0, 200) : null,
        typeof e.notes === "string" && e.notes.trim() !== "" ? e.notes.trim().slice(0, 4000) : null,
        standards,
        now
      );
    }
  });
  tx();

  redirect(`/record?imported=${valid.length}`);
}

export async function updateEntryNotes(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const entryId = Number(formData.get("entry_id"));
  const notes = str(formData, "notes");
  getDb()
    .prepare("UPDATE cpd_entries SET notes = ? WHERE id = ? AND user_id = ?")
    .run(notes || null, entryId, user.id);
  revalidatePath("/record");
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const entryId = Number(formData.get("entry_id"));
  getDb()
    .prepare("DELETE FROM cpd_entries WHERE id = ? AND user_id = ? AND verified = 0")
    .run(entryId, user.id);
  revalidatePath("/record");
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const current = formData.get("current_password");
  const next = formData.get("new_password");
  const confirm = formData.get("confirm_password");

  if (typeof current !== "string" || !current) return { error: "Enter your current password." };
  if (!(await bcrypt.compare(current, user.password_hash)))
    return { error: "That isn’t your current password." };
  if (typeof next !== "string" || next.length < 8)
    return { error: "Your new password must be at least 8 characters." };
  if (next !== confirm) return { error: "The two new passwords don’t match." };
  if (next === current) return { error: "That’s already your password." };

  const db = getDb();
  const hash = await bcrypt.hash(next, 10);
  // Changing a password should end any session you did not change it from —
  // that is the point of changing it if someone else has been signed in.
  const currentToken = (await cookies()).get("cpd_session")?.value ?? "";
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?").run(user.id, currentToken);
  })();

  revalidatePath("/account");
  return null;
}

export async function setBackupEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const email = str(formData, "backup_email").toLowerCase();
  const db = getDb();

  if (!email) {
    db.prepare("UPDATE users SET backup_email = NULL WHERE id = ?").run(user.id);
    revalidatePath("/account");
    return null;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (email === user.email.toLowerCase())
    return { error: "That’s already the email on your account. Use a different one." };

  // A backup address must not be a route into somebody else's account.
  const taken = db
    .prepare("SELECT id FROM users WHERE (email = ? OR backup_email = ?) AND id != ?")
    .get(email, email, user.id);
  if (taken) return { error: "That address is already in use on another account." };

  db.prepare("UPDATE users SET backup_email = ? WHERE id = ?").run(email, user.id);
  revalidatePath("/account");
  return null;
}

/** Ends every session except the one making the request. */
export async function revokeOtherSessions(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const currentToken = (await cookies()).get("cpd_session")?.value ?? "";
  getDb()
    .prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?")
    .run(user.id, currentToken);
  revalidatePath("/account");
}

export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const password = formData.get("password");
  if (typeof password !== "string" || !password)
    return { error: "Enter your password to confirm." };
  if (!(await bcrypt.compare(password, user.password_hash)))
    return { error: "That password isn’t right." };
  if (str(formData, "confirm") !== "DELETE")
    return { error: "Type DELETE in the box to confirm." };

  const db = getDb();
  db.transaction(() => {
    // Yours alone — removed outright.
    db.prepare("DELETE FROM cpd_entries WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM activity_type_goals WHERE user_id = ?").run(user.id);

    // Signatures are somebody else's evidence: an organiser's register and any
    // slip already handed to an auditor. Deleting them would silently alter a
    // record other people rely on and break every issued verification code, so
    // the person is removed from them instead of the attendance.
    db.prepare(
      `UPDATE signatures
         SET user_id = NULL,
             full_name = 'Deleted account',
             email = '',
             professional_body = NULL,
             registration_number = NULL,
             role_grade = NULL
       WHERE user_id = ?`
    ).run(user.id);

    // Registers they organised outlive the account for the same reason. The
    // organiser's name stays because it is printed on issued slips and shown
    // on the public verification page. Open ones are closed: nobody is left
    // to run them.
    db.prepare("UPDATE registers SET closed_manually = 1 WHERE organiser_id = ?").run(user.id);
    db.prepare("UPDATE registers SET organiser_id = NULL WHERE organiser_id = ?").run(user.id);

    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  })();

  (await cookies()).delete("cpd_session");
  redirect("/?deleted=1");
}
