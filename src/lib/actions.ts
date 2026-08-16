"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getDb,
  registerStatus,
  type CpdEntry,
  type PlannedEvent,
  type Register,
  type Signature,
  type User,
} from "./db";
import { createSession, destroySession, getCurrentUser } from "./auth";
import { forgetGuestSlip, getGuestSlipCode, rememberGuestSlip } from "./guest-signature";
import { getBaseUrl } from "./base-url";
import {
  sendEmailChangeConfirmation,
  sendEmailChangeNotice,
  sendEmailConfirmation,
  sendFeedbackReport,
  sendPasswordReset,
  sendRecoveryConfirmation,
} from "./email";
import { claimToken, issueToken } from "./tokens";
import {
  consumeRecoveryCode,
  issueRecoveryCodes,
  newSecret,
  RECOVERY_FLASH_COOKIE,
  verifyCode,
} from "./totp";
import { bucketSize, record } from "./analytics";
import { newRegisterCode, newVerificationCode } from "./ids";
import { ACTIVITY_TYPES, EVENT_TYPES, REGULATORS } from "./format";
import { mapRows, parseSpreadsheet, type ImportResult, type ParsedEntry } from "./import";
import { FEEDBACK_QUESTIONS, QUESTION_SET_VERSION, SCALE_POINTS } from "./feedback";
import { frameworkFor, serialiseStandards, validStandards } from "./standards";

export type ActionState = { error: string } | null;

export type ImportPreviewState =
  | { error: string }
  | {
      fileName: string;
      entries: ParsedEntry[];
      issues: string[];
      totalRows: number;
      mapping: ImportResult["mapping"];
    }
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

  const db = await getDb();
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return { error: "An account with that email already exists. Try logging in." };

  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  const created = (await db
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, profession, regulator, registration_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
    .get(email, hash, fullName, profession || null, regulator || null, registrationNumber || null, now)) as {
    id: number;
  };
  const userId = Number(created.id);

  const fromSlip = await getGuestSlipCode();
  await claimGuestSignatures(userId, email, fromSlip);
  await forgetGuestSlip();
  await record({ name: "signup", source: fromSlip ? "guest_slip" : "direct" });

  // Confirming the address is what lets future slips be matched to it safely.
  // Failing to send must not lose the account that was just created.
  try {
    const token = await issueToken(userId, email, "verify");
    await sendEmailConfirmation(email, fullName, `${await getBaseUrl()}/verify-email/${token}`);
  } catch (error) {
    console.error("[signup] confirmation email failed", error);
  }

  await createSession(userId);
  redirect("/dashboard");
}

async function claimGuestSignatures(
  userId: number,
  email: string,
  alsoCode?: string | null
): Promise<void> {
  const db = await getDb();
  const orphans = await db
    .prepare(
      `SELECT s.*, r.title, r.event_date, r.is_official, r.points, r.hours, r.organiser_name
       FROM signatures s JOIN registers r ON r.id = s.register_id
       WHERE s.user_id IS NULL AND s.voided = 0 AND (s.email = ? OR s.verification_code = ?)`
    )
    .all(email, alsoCode ?? "") as (Signature & Pick<Register, "title" | "event_date" | "is_official" | "points" | "hours" | "organiser_name">)[];

  if (orphans.length === 0) return;

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const s of orphans) {
      await tx.prepare("UPDATE signatures SET user_id = ? WHERE id = ?").run(userId, s.id);
      await tx
        .prepare(
          `INSERT INTO cpd_entries (user_id, signature_id, title, activity_date, activity_type, is_official, points, hours, provider, verified, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
        )
        .run(
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
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, "email").toLowerCase();
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password)
    return { error: "Enter your email and password." };

  if (await tooManyAttempts(email))
    return {
      error:
        "Too many sign-in attempts for that address. Wait 15 minutes, or reset your password.",
    };

  const db = await getDb();
  const user = (await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email)) as User | undefined;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    await recordFailedAttempt(email);
    return { error: "Email or password is incorrect." };
  }
  await clearAttempts(email);

  // A correct password is only the first factor. Nothing is signed in until
  // the code is right.
  if (user.totp_confirmed_at) {
    await issuePendingTwoFactor(user.id, email);
    redirect("/login/two-factor");
  }

  // Someone who signed a register as a guest and then logs in should get those
  // slips too — not just people who create an account afterwards.
  await claimGuestSignatures(user.id, email, await getGuestSlipCode());
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

  await (await getDb())
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

  const db = await getDb();
  const code = newRegisterCode();
  const created = (await db
    .prepare(
      `INSERT INTO registers
        (code, organiser_id, organiser_name, title, description, event_date, start_time, end_time, location,
         event_type, is_official, accrediting_body, points, hours, opens_at, closes_at, access_code,
         feedback_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .get(
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
    )) as { id: number };

  await record({
    name: "register_created",
    official: isOfficial,
    collecting_feedback: str(formData, "collect_feedback") === "yes",
  });

  redirect(`/registers/${Number(created.id)}`);
}

async function requireOwnedRegister(user: User, registerId: number): Promise<Register> {
  const reg = await (await getDb())
    .prepare("SELECT * FROM registers WHERE id = ?").get(registerId) as
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
  await requireOwnedRegister(user, registerId);
  await (await getDb())
    .prepare("UPDATE registers SET closed_manually = ? WHERE id = ?").run(closed ? 1 : 0, registerId);
  revalidatePath(`/registers/${registerId}`);
}

export async function setFeedbackEnabled(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const registerId = Number(formData.get("register_id"));
  const enabled = str(formData, "enabled") === "1";
  await requireOwnedRegister(user, registerId);
  await (await getDb())
    .prepare("UPDATE registers SET feedback_enabled = ? WHERE id = ?")
    .run(enabled ? 1 : 0, registerId);
  revalidatePath(`/registers/${registerId}`);
}

export async function voidSignature(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const signatureId = Number(formData.get("signature_id"));
  const reason = str(formData, "reason") || "Voided by organiser";

  const db = await getDb();
  const sig = await db.prepare("SELECT * FROM signatures WHERE id = ?").get(signatureId) as
    | Signature
    | undefined;
  if (!sig) return;
  await requireOwnedRegister(user, sig.register_id);

  await db.transaction(async (tx) => {
    await tx
      .prepare("UPDATE signatures SET voided = 1, void_reason = ? WHERE id = ?")
      .run(reason, signatureId);
    await tx.prepare("UPDATE cpd_entries SET verified = 0 WHERE signature_id = ?").run(signatureId);
  });
  revalidatePath(`/registers/${sig.register_id}`);
}

// ---------------------------------------------------------------------------
// Public signing
// ---------------------------------------------------------------------------

export async function signRegister(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = str(formData, "register_code");
  const db = await getDb();
  const reg = await db.prepare("SELECT * FROM registers WHERE code = ?").get(code) as Register | undefined;
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

  const dup = await db
    .prepare("SELECT id FROM signatures WHERE register_id = ? AND email = ? AND voided = 0")
    .get(reg.id, email);
  if (dup) return { error: "This email has already signed the register for this event." };

  const verificationCode = newVerificationCode();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    const sigResult = (await tx
      .prepare(
        `INSERT INTO signatures
          (register_id, user_id, full_name, email, professional_body, registration_number, role_grade, signed_at, verification_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`
      )
      .get(
        reg.id,
        user?.id ?? null,
        fullName,
        email,
        professionalBody,
        registrationNumber,
        roleGrade,
        now,
        verificationCode
      )) as { id: number };

    if (user) {
      await tx.prepare(
        `INSERT INTO cpd_entries (user_id, signature_id, title, activity_date, activity_type, is_official, points, hours, provider, verified, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).run(
        user.id,
        Number(sigResult.id),
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

  await record({ name: "register_signed", as: user ? "account" : "guest" });

  // Guests only: an account holder's slip is already on their record.
  if (!user) await rememberGuestSlip(verificationCode);

  redirect(`/r/${reg.code}/signed?sig=${verificationCode}`);
}

// ---------------------------------------------------------------------------
// Event feedback
// ---------------------------------------------------------------------------

export async function submitFeedback(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const verificationCode = str(formData, "verification_code");
  const db = await getDb();

  const sig = await db
    .prepare("SELECT * FROM signatures WHERE verification_code = ?")
    .get(verificationCode) as Signature | undefined;
  if (!sig) return { error: "We could not match that attendance record." };
  if (sig.voided) return { error: "This attendance record has been voided." };

  const reg = await db.prepare("SELECT * FROM registers WHERE id = ?").get(sig.register_id) as
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

  await db.transaction(async (tx) => {
    await tx.prepare(
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
    await tx.prepare("UPDATE signatures SET feedback_given = 1 WHERE id = ?").run(sig.id);

    // The attendee's own copy is a different thing from the organiser's
    // anonymous aggregate: it sits on their CPD record, attributed to them,
    // because regulators ask for exactly this reflection.
    if (keepReflection && sig.user_id) {
      const entry = await tx
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
        await tx.prepare("UPDATE cpd_entries SET notes = ? WHERE id = ?").run(
          merged.slice(0, 2000),
          entry.id
        );
      }
    }
  });

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

  await (await getDb())
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
  const db = await getDb();
  const entry = await db
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

  await db.prepare(
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
  const db = await getDb();

  if (!target) {
    await db.prepare("DELETE FROM activity_type_goals WHERE user_id = ? AND activity_type = ?").run(
      user.id,
      activityType
    );
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || isNaN(Date.parse(target)))
      return { error: "Enter a valid date." };
    if (target < new Date().toISOString().slice(0, 10))
      return { error: "Pick a date in the future." };
    await db.prepare(
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

  await (await getDb())
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

  const { entries, issues, totalRows, mapping } = mapRows(rows);
  if (entries.length === 0) {
    return {
      error:
        "No importable rows were found. " +
        (issues[0] ?? "Check the file matches the expected columns — download the template for an example."),
    };
  }
  return { fileName: file.name, entries, issues, totalRows, mapping };
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
  const db = await getDb();
  const insert = await db.prepare(
    `INSERT INTO cpd_entries (user_id, title, activity_date, activity_type, is_official, points, hours, provider, notes, standards, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  );
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
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

  await record({ name: "record_imported", size: bucketSize(valid.length) });

  redirect(`/record?imported=${valid.length}`);
}

export async function updateEntryNotes(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const entryId = Number(formData.get("entry_id"));
  const notes = str(formData, "notes");
  (await getDb())
    .prepare("UPDATE cpd_entries SET notes = ? WHERE id = ? AND user_id = ?")
    .run(notes || null, entryId, user.id);
  revalidatePath("/record");
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const entryId = Number(formData.get("entry_id"));
  await (await getDb())
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

  const db = await getDb();
  const hash = await bcrypt.hash(next, 10);
  // Changing a password should end any session you did not change it from —
  // that is the point of changing it if someone else has been signed in.
  const currentToken = (await cookies()).get("cpd_session")?.value ?? "";
  await db.transaction(async (tx) => {
    await tx.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
    await tx.prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?").run(user.id, currentToken);
  });

  revalidatePath("/account");
  return null;
}

export async function setBackupEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const email = str(formData, "backup_email").toLowerCase();
  const db = await getDb();

  if (!email) {
    await db
      .prepare("UPDATE users SET backup_email = NULL, backup_email_verified_at = NULL WHERE id = ?")
      .run(user.id);
    revalidatePath("/account");
    return null;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (email === user.email.toLowerCase())
    return { error: "That’s already the email on your account. Use a different one." };

  // A recovery address must not be a route into somebody else's account.
  const taken = await db
    .prepare("SELECT id FROM users WHERE (email = ? OR backup_email = ?) AND id != ?")
    .get(email, email, user.id);
  if (taken) return { error: "That address is already in use on another account." };

  // Saving it always resets the confirmation: a new address has proved
  // nothing, and re-saving the same one is how someone asks for another link.
  await db
    .prepare("UPDATE users SET backup_email = ?, backup_email_verified_at = NULL WHERE id = ?")
    .run(email, user.id);

  try {
    const token = await issueToken(user.id, email, "verify_backup");
    const base = await getBaseUrl();
    await sendRecoveryConfirmation(email, user.full_name, `${base}/verify-recovery/${token}`, user.email);
  } catch (error) {
    console.error("[account] recovery confirmation failed", error);
    redirect("/account?recovery=failed");
  }
  revalidatePath("/account");
  redirect("/account?recovery=sent");
}

/** Confirms the recovery address, from the link sent to it. */
export async function applyRecoveryConfirmation(token: string): Promise<boolean> {
  const claimed = await claimToken(token, "verify_backup");
  if (!claimed) return false;

  const db = await getDb();
  // The address on the account may have been changed since the link was sent;
  // confirming a stale one would mark the current address proved when it isn't.
  const result = await db
    .prepare(
      "UPDATE users SET backup_email_verified_at = ? WHERE id = ? AND backup_email = ?"
    )
    .run(new Date().toISOString(), claimed.user_id, claimed.email);
  return result.changes > 0;
}

/**
 * Starts a change of the sign-in address.
 *
 * The new address is only stored once it has been confirmed, because guest
 * attendance is matched by email: switching first and asking later would let
 * anyone claim a colleague's slips by typing their address.
 */
export async function requestEmailChange(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const email = str(formData, "new_email").toLowerCase();
  const password = formData.get("password");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (email === user.email.toLowerCase())
    return { error: "That is already the address on your account." };
  // Changing where sign-in links and reset links go is a credential change.
  if (typeof password !== "string" || !(await bcrypt.compare(password, user.password_hash)))
    return { error: "That password isn’t right." };

  const db = await getDb();
  const taken = await db
    .prepare("SELECT id FROM users WHERE (email = ? OR backup_email = ?) AND id != ?")
    .get(email, email, user.id);
  if (taken) return { error: "That address is already in use on another account." };

  try {
    const token = await issueToken(user.id, email, "email_change");
    const base = await getBaseUrl();
    await sendEmailChangeConfirmation(email, user.full_name, `${base}/change-email/${token}`, user.email);
    // The address being replaced is told, so a change made with a stolen
    // password is not silent to the person it is being taken from.
    await sendEmailChangeNotice(user.email, user.full_name, email);
  } catch (error) {
    console.error("[account] email change email failed", error);
    redirect("/account?change=failed");
  }
  revalidatePath("/account");
  redirect("/account?change=sent");
}

/** Completes the change, from the link sent to the new address. */
export async function applyEmailChange(
  token: string
): Promise<{ ok: true; email: string } | { ok: false; reason: "invalid" | "taken" }> {
  const claimed = await claimToken(token, "email_change");
  if (!claimed) return { ok: false, reason: "invalid" };

  const db = await getDb();
  // Re-checked at this point, not just when the link was sent: someone else
  // may have signed up with the address in the meantime.
  const taken = await db
    .prepare("SELECT id FROM users WHERE (email = ? OR backup_email = ?) AND id != ?")
    .get(claimed.email, claimed.email, claimed.user_id);
  if (taken) return { ok: false, reason: "taken" };

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE users SET email = ?, email_verified_at = ? WHERE id = ?")
    .run(claimed.email, now, claimed.user_id);

  // Confirmed, so guest slips signed with this address are theirs — the same
  // rule that applies at signup.
  await claimGuestSignatures(claimed.user_id, claimed.email);

  // Other sessions go, as with a password change: if the change was not the
  // owner's doing, whoever made it should not keep a way in.
  const current = (await cookies()).get("cpd_session")?.value;
  await db
    .prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?")
    .run(claimed.user_id, current ?? "");

  // No revalidatePath here: this runs while the confirmation page renders, and
  // revalidating during a render is unsupported. The account page is dynamic,
  // so it reads the new address on its next request anyway.
  return { ok: true, email: claimed.email };
}

/** Ends every session except the one making the request. */
export async function revokeOtherSessions(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const currentToken = (await cookies()).get("cpd_session")?.value ?? "";
  await (await getDb())
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

  const db = await getDb();
  await db.transaction(async (tx) => {
    // Yours alone — removed outright.
    await tx.prepare("DELETE FROM cpd_entries WHERE user_id = ?").run(user.id);
    await tx.prepare("DELETE FROM activity_type_goals WHERE user_id = ?").run(user.id);

    // Signatures are somebody else's evidence: an organiser's register and any
    // slip already handed to an auditor. Deleting them would silently alter a
    // record other people rely on and break every issued verification code, so
    // the person is removed from them instead of the attendance.
    await tx.prepare(
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
    await tx.prepare("UPDATE registers SET closed_manually = 1 WHERE organiser_id = ?").run(user.id);
    await tx.prepare("UPDATE registers SET organiser_id = NULL WHERE organiser_id = ?").run(user.id);

    await tx.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    await tx.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  });

  (await cookies()).delete("cpd_session");
  redirect("/?deleted=1");
}

// ---------------------------------------------------------------------------
// Password reset, email confirmation and sign-in throttling
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MIN = 15;

/**
 * Failed sign-ins per email in a rolling window, so a password cannot be guessed.
 *
 * `max` is lower for one-time codes: six digits is a million possibilities
 * against a password's effectively unbounded space, and an attacker trying
 * them already holds the password.
 */
async function tooManyAttempts(key: string, max = MAX_ATTEMPTS): Promise<boolean> {
  const db = await getDb();
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MIN * 60 * 1000).toISOString();
  // Pruning here keeps the table from growing without a scheduled job.
  await db.prepare("DELETE FROM auth_attempts WHERE attempted_at < ?").run(since);
  const row = (await db
    .prepare("SELECT COUNT(*) AS c FROM auth_attempts WHERE key = ? AND attempted_at >= ?")
    .get(key, since)) as { c: number };
  return Number(row.c) >= max;
}

async function recordFailedAttempt(key: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare("INSERT INTO auth_attempts (key, attempted_at) VALUES (?, ?)")
    .run(key, new Date().toISOString());
}

async function clearAttempts(key: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM auth_attempts WHERE key = ?").run(key);
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = str(formData, "email").toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };

  const db = await getDb();
  const user = (await db
    .prepare(
      `SELECT id, full_name, email, backup_email, backup_email_verified_at
         FROM users WHERE email = ? OR backup_email = ?`
    )
    .get(email, email)) as
    | {
        id: number;
        full_name: string;
        email: string;
        backup_email: string | null;
        backup_email_verified_at: string | null;
      }
    | undefined;

  // Deliberately the same outcome either way: telling a stranger whether an
  // address has an account here reveals that someone is a registrant.
  if (user) {
    // The point of a recovery address is the day the main one is unreachable,
    // so a reset asked for from a confirmed recovery address is sent there.
    // An unconfirmed one is not used: it has proved nothing, and sending a
    // reset link to it would make typing an address enough to take an account.
    const sendTo =
      email === user.backup_email?.toLowerCase() && user.backup_email_verified_at
        ? user.backup_email
        : user.email;
    const token = await issueToken(Number(user.id), sendTo, "reset");
    const base = await getBaseUrl();
    await sendPasswordReset(sendTo, user.full_name, `${base}/reset/${token}`);
  }
  redirect("/reset/sent");
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = str(formData, "token");
  const password = formData.get("password");
  const confirm = formData.get("confirm");

  if (typeof password !== "string" || password.length < 8)
    return { error: "Your new password must be at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don’t match." };

  const claimed = await claimToken(token, "reset");
  if (!claimed)
    return { error: "That link has expired or has already been used. Request a new one." };

  const db = await getDb();
  const hash = await bcrypt.hash(password, 10);
  await db.transaction(async (tx) => {
    await tx.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, claimed.user_id);
    // Whoever prompted the reset should not still be signed in somewhere.
    await tx.prepare("DELETE FROM sessions WHERE user_id = ?").run(claimed.user_id);
    await tx.prepare("DELETE FROM auth_attempts WHERE key = ?").run(claimed.email);
  });

  redirect("/login?reset=1");
}

/** Sends (or resends) the confirmation link for the signed-in user's address. */
export async function sendVerificationEmail(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.email_verified_at) return;

  // The outcome has to reach the page. A form action that returns silently
  // leaves someone clicking a button that, for all they can tell, does
  // nothing — and a provider rejecting the address would be invisible.
  try {
    const token = await issueToken(user.id, user.email, "verify");
    const base = await getBaseUrl();
    await sendEmailConfirmation(user.email, user.full_name, `${base}/verify-email/${token}`);
  } catch (error) {
    console.error("[account] verification email failed", error);
    redirect("/account?sent=failed");
  }
  revalidatePath("/account");
  redirect("/account?sent=1");
}

// ---------------------------------------------------------------------------
// User feedback
// ---------------------------------------------------------------------------

const FEEDBACK_KINDS = ["Something is broken", "Something is confusing", "An idea", "Anything else"];

export async function submitFeedbackReport(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const message = str(formData, "message");
  if (message.length < 10)
    return { error: "Tell us a little more — a sentence or two is enough." };
  if (message.length > 4000) return { error: "That is longer than we can send. Trim it a little." };

  const kind = str(formData, "kind");
  if (!FEEDBACK_KINDS.includes(kind)) return { error: "Choose what kind of report this is." };

  const user = await getCurrentUser();
  const given = str(formData, "reply_to").toLowerCase();
  if (given && !/^\S+@\S+\.\S+$/.test(given))
    return { error: "That email address doesn't look right. Leave it blank if you'd rather not." };

  // One person cannot flood the inbox. Keyed on the account or the reported
  // page, whichever identifies them, and reusing the sign-in throttle table.
  const key = `feedback:${user?.email ?? (given || "anonymous")}`;
  if (await tooManyAttempts(key))
    return { error: "Thanks — that's several reports in a short time. Try again in 15 minutes." };
  await recordFailedAttempt(key);

  // A screenshot usually says more than the description does. Kept small
  // enough to survive the serverless request-body cap with room to spare.
  const MAX_SHOT_BYTES = 3 * 1024 * 1024;
  const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  let attachment: { filename: string; content: Buffer } | null = null;
  const shot = formData.get("screenshot");
  if (shot instanceof File && shot.size > 0) {
    if (!ALLOWED.includes(shot.type))
      return { error: "That file isn't an image. PNG, JPEG, WebP or GIF, please." };
    if (shot.size > MAX_SHOT_BYTES)
      return { error: "That image is over 3 MB. Crop it, or send a smaller screenshot." };
    attachment = {
      filename: shot.name || "screenshot.png",
      content: Buffer.from(await shot.arrayBuffer()),
    };
  }

  try {
    await sendFeedbackReport({
      kind,
      message,
      page: str(formData, "page") || null,
      from: user?.email ?? (given || null),
      userAgent: str(formData, "user_agent").slice(0, 300) || null,
      attachment,
    });
  } catch (error) {
    console.error("[feedback] send failed", error);
    return { error: "We couldn't send that just now. Please try again in a moment." };
  }

  await record({ name: "report_submitted", kind });

  redirect("/feedback/thanks");
}

// ---------------------------------------------------------------------------
// Two-factor authentication
// ---------------------------------------------------------------------------

const PENDING_2FA_COOKIE = "cpd_2fa_pending";
/** Long enough to fetch a phone, short enough that a shared computer is safe. */
const PENDING_2FA_MINUTES = 10;
/** Deliberately below the password limit — see tooManyAttempts. */
const MAX_CODE_ATTEMPTS = 5;

/** Begins setup: mints a secret but does not switch 2FA on. */
export async function beginTwoFactor(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.totp_confirmed_at) redirect("/account/two-factor");

  await (await getDb())
    .prepare("UPDATE users SET totp_secret = ? WHERE id = ?")
    .run(newSecret(), user.id);
  redirect("/account/two-factor");
}

/** Switches 2FA on, but only once a code proves the app is set up correctly. */
export async function confirmTwoFactor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.totp_secret) return { error: "Start again — no setup is in progress." };
  if (user.totp_confirmed_at) return { error: "Two-factor authentication is already on." };

  if (!verifyCode(user.totp_secret, user.email, str(formData, "code")))
    return { error: "That code isn't right. Check your app and try the current code." };

  await (await getDb())
    .prepare("UPDATE users SET totp_confirmed_at = ? WHERE id = ?")
    .run(new Date().toISOString(), user.id);
  await flashRecoveryCodes(await issueRecoveryCodes(user.id));
  redirect("/account/two-factor?new=1");
}

export async function disableTwoFactor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Turning a second factor off is exactly what an attacker with a borrowed
  // session would do, so it costs a password.
  const password = formData.get("password");
  if (typeof password !== "string" || !(await bcrypt.compare(password, user.password_hash)))
    return { error: "That password isn't right." };

  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .prepare("UPDATE users SET totp_secret = NULL, totp_confirmed_at = NULL WHERE id = ?")
      .run(user.id);
    await tx.prepare("DELETE FROM recovery_codes WHERE user_id = ?").run(user.id);
  });
  revalidatePath("/account");
  redirect("/account");
}

export async function regenerateRecoveryCodes(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.totp_confirmed_at) redirect("/account");
  await flashRecoveryCodes(await issueRecoveryCodes(user.id));
  redirect("/account/two-factor?new=1");
}

/**
 * The second step of signing in.
 *
 * The password stage leaves a short-lived pending token rather than a session,
 * so a correct password alone never grants access.
 */
export async function completeTwoFactor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = (await cookies()).get(PENDING_2FA_COOKIE)?.value;
  if (!token) redirect("/login");

  const claimed = await claimToken(token, "2fa");
  if (!claimed) {
    (await cookies()).delete(PENDING_2FA_COOKIE);
    return { error: "That took too long. Sign in again." };
  }

  const db = await getDb();
  const user = (await db.prepare("SELECT * FROM users WHERE id = ?").get(claimed.user_id)) as
    | User
    | undefined;
  if (!user?.totp_secret) redirect("/login");

  // Throttled separately from the password: six digits is a small space, and
  // an attacker reaching this step already holds the password.
  const key = `2fa:${user.email}`;
  if (await tooManyAttempts(key, MAX_CODE_ATTEMPTS))
    return { error: "Too many codes tried. Wait 15 minutes and sign in again." };

  const entered = str(formData, "code");
  const ok = str(formData, "mode") === "recovery"
    ? await consumeRecoveryCode(user.id, entered)
    : verifyCode(user.totp_secret, user.email, entered);

  if (!ok) {
    await recordFailedAttempt(key);
    // A spent token cannot be reused, so a fresh one keeps the attempt alive
    // without letting a wrong guess restart the clock from the password stage.
    await issuePendingTwoFactor(user.id, user.email);
    return { error: "That code isn't right. Try the current one, or a recovery code." };
  }

  await clearAttempts(key);
  (await cookies()).delete(PENDING_2FA_COOKIE);

  // The same claim the one-step path does. It lives here rather than beside
  // the password check because until the code is right nobody is signed in,
  // and slips must not be moved onto an account that was never reached.
  await claimGuestSignatures(user.id, user.email, await getGuestSlipCode());
  await forgetGuestSlip();

  await createSession(user.id);
  redirect("/dashboard");
}

/** Stores the half-finished sign-in as a short-lived, single-use token. */
async function issuePendingTwoFactor(userId: number, email: string): Promise<void> {
  const token = await issueToken(userId, email, "2fa");
  (await cookies()).set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + PENDING_2FA_MINUTES * 60 * 1000),
    path: "/",
  });
}

/**
 * Carries a freshly issued set of codes through the redirect to the page that
 * shows them.
 *
 * They are stored hashed, so this is the only moment they exist in readable
 * form — but a redirect cannot carry a value, and putting ten working second
 * factors in a URL would write them into browser history and server logs. A
 * short-lived httpOnly cookie keeps them out of both, and out of reach of any
 * script on the page.
 */
async function flashRecoveryCodes(codes: string[]): Promise<void> {
  (await cookies()).set(RECOVERY_FLASH_COOKIE, codes.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + 15 * 60 * 1000),
    path: "/",
  });
}

/** Clears the codes from the browser once the user says they have saved them. */
export async function dismissRecoveryCodes(): Promise<void> {
  (await cookies()).delete(RECOVERY_FLASH_COOKIE);
  redirect("/account");
}

// ---------------------------------------------------------------------------
// Planned CPD, and the calendar feed it publishes
// ---------------------------------------------------------------------------

/** Reads a planned event's fields from a form, or says what is wrong. */
function plannedFields(formData: FormData): { error: string } | Record<string, unknown> {
  const title = str(formData, "title");
  const startsOn = str(formData, "starts_on");
  const endsOn = str(formData, "ends_on");
  const startTime = str(formData, "start_time");
  const endTime = str(formData, "end_time");

  if (!title) return { error: "Give it a name — whatever you'd recognise it by." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return { error: "Enter the date it starts." };
  if (endsOn && endsOn < startsOn) return { error: "The end date is before the start date." };
  if (endTime && !startTime)
    return { error: "Add a start time as well, or leave both blank for an all-day entry." };
  if (endTime && startTime && (endsOn || startsOn) === startsOn && endTime <= startTime)
    return { error: "The end time is before the start time." };

  return {
    title,
    startsOn,
    endsOn: endsOn || null,
    startTime: startTime || null,
    endTime: endTime || null,
    location: str(formData, "location") || null,
    provider: str(formData, "provider") || null,
    url: str(formData, "url") || null,
    notes: str(formData, "notes") || null,
    points: num(formData, "expected_points"),
    hours: num(formData, "expected_hours"),
  };
}

export async function addPlannedEvent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const fields = plannedFields(formData);
  if ("error" in fields) return fields as { error: string };
  const f = fields as Record<string, string | number | null>;

  const now = new Date().toISOString();
  await (await getDb())
    .prepare(
      `INSERT INTO planned_events
         (user_id, title, starts_on, ends_on, start_time, end_time, location, provider, url,
          notes, expected_points, expected_hours, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id, f.title, f.startsOn, f.endsOn, f.startTime, f.endTime, f.location,
      f.provider, f.url, f.notes, f.points, f.hours, now, now
    );

  await record({ name: "planned_event_added" });
  revalidatePath("/record/planned");
  redirect("/record/planned");
}

export async function updatePlannedEvent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = num(formData, "id");
  if (id === null) return { error: "Something went wrong. Try again from the list." };

  const fields = plannedFields(formData);
  if ("error" in fields) return fields as { error: string };
  const f = fields as Record<string, string | number | null>;

  // revision is bumped so a calendar that already holds this event treats the
  // new version as an update rather than ignoring it.
  const result = await (await getDb())
    .prepare(
      `UPDATE planned_events
          SET title = ?, starts_on = ?, ends_on = ?, start_time = ?, end_time = ?,
              location = ?, provider = ?, url = ?, notes = ?, expected_points = ?,
              expected_hours = ?, revision = revision + 1, updated_at = ?
        WHERE id = ? AND user_id = ?`
    )
    .run(
      f.title, f.startsOn, f.endsOn, f.startTime, f.endTime, f.location, f.provider,
      f.url, f.notes, f.points, f.hours, new Date().toISOString(), id, user.id
    );
  if (result.changes === 0) return { error: "That plan no longer exists." };

  revalidatePath("/record/planned");
  redirect("/record/planned");
}

export async function deletePlannedEvent(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = num(formData, "id");
  if (id === null) redirect("/record/planned");

  await (await getDb())
    .prepare("DELETE FROM planned_events WHERE id = ? AND user_id = ?")
    .run(id, user.id);
  revalidatePath("/record/planned");
  redirect("/record/planned");
}

/**
 * Turns a plan that happened into a record entry.
 *
 * Self-reported, never verified: intending to attend and attending are not the
 * same claim, and only a signed register can tell them apart.
 */
export async function recordPlannedEvent(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = num(formData, "id");
  if (id === null) redirect("/record/planned");

  const db = await getDb();
  const plan = (await db
    .prepare("SELECT * FROM planned_events WHERE id = ? AND user_id = ?")
    .get(id, user.id)) as PlannedEvent | undefined;
  if (!plan || plan.outcome) redirect("/record/planned");

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const created = (await tx
      .prepare(
        `INSERT INTO cpd_entries
           (user_id, title, activity_date, activity_type, is_official, points, hours,
            provider, notes, verified, created_at)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?)
         RETURNING id`
      )
      .get(
        user.id, plan.title, plan.starts_on, "Formal / educational",
        plan.expected_points, plan.expected_hours, plan.provider, plan.notes, now
      )) as { id: number };

    await tx
      .prepare(
        "UPDATE planned_events SET outcome = 'recorded', cpd_entry_id = ?, updated_at = ? WHERE id = ?"
      )
      .run(Number(created.id), now, id);
  });

  revalidatePath("/record");
  redirect("/record/complete");
}

/** Answers "did you go?" with no, so it stops being asked. */
export async function dismissPlannedEvent(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = num(formData, "id");
  if (id === null) redirect("/record/planned");

  await (await getDb())
    .prepare(
      "UPDATE planned_events SET outcome = 'missed', updated_at = ? WHERE id = ? AND user_id = ?"
    )
    .run(new Date().toISOString(), id, user.id);
  revalidatePath("/record/planned");
  redirect("/record/planned");
}

/**
 * The secret in the subscription URL.
 *
 * Minted on first use rather than at signup, so an account that never opens
 * the calendar page never has a live feed address in the first place.
 */
export async function ensureCalendarToken(userId: number): Promise<string> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT calendar_token FROM users WHERE id = ?")
    .get(userId)) as { calendar_token: string | null };
  if (row.calendar_token) return row.calendar_token;

  const token = crypto.randomBytes(24).toString("base64url");
  await db.prepare("UPDATE users SET calendar_token = ? WHERE id = ?").run(token, userId);
  return token;
}

/** Replaces the address, which is the only way to revoke a shared one. */
export async function regenerateCalendarToken(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await (await getDb())
    .prepare("UPDATE users SET calendar_token = ? WHERE id = ?")
    .run(crypto.randomBytes(24).toString("base64url"), user.id);
  revalidatePath("/record/planned");
  redirect("/record/planned?feed=new");
}
