import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, type CpdEntry, type Register, type Signature } from "@/lib/db";

/** Everything this account holds, as one file the user can keep or move. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", "http://localhost"));

  const db = await getDb();
  const { password_hash: _omitted, ...account } = user;

  const payload = {
    exported_at: new Date().toISOString(),
    account,
    cpd_entries: await db
      .prepare("SELECT * FROM cpd_entries WHERE user_id = ? ORDER BY activity_date DESC")
      .all(user.id) as CpdEntry[],
    attendances: await db
      .prepare("SELECT * FROM signatures WHERE user_id = ? ORDER BY signed_at DESC")
      .all(user.id) as Signature[],
    registers_organised: await db
      .prepare("SELECT * FROM registers WHERE organiser_id = ? ORDER BY event_date DESC")
      .all(user.id) as Register[],
    activity_type_goals: await db
      .prepare("SELECT * FROM activity_type_goals WHERE user_id = ?")
      .all(user.id),
    // Feedback rounds the user asked for: the request and who was invited,
    // which are theirs. The colleagues' answers are not included even though
    // they are about this person — they are stored with no link to who gave
    // them, so there is no "their answer" to hand over, only the pool.
    colleague_feedback_requests: await db
      .prepare("SELECT * FROM msf_requests WHERE user_id = ?")
      .all(user.id),
    colleague_feedback_invitations: await db
      .prepare(
        `SELECT i.request_id, i.email, i.responded, i.created_at
           FROM msf_invitations i
           JOIN msf_requests r ON r.id = i.request_id
          WHERE r.user_id = ?`
      )
      .all(user.id),
    // Feedback the user gave is deliberately not here: it is stored with no
    // link to who gave it, so there is nothing to retrieve. That is the same
    // property that makes it anonymous to the organiser.
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cpd-register-data-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
