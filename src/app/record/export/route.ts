import { NextResponse } from "next/server";
import { getDb, type CpdEntry } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/format";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorised", { status: 401 });
  // A data endpoint answers rather than redirects: a browser download that
  // silently returned an HTML page would look like a corrupt file.
  if (!user.email_verified_at)
    return new NextResponse("Confirm your email address before exporting.", { status: 403 });

  const entries = await (await getDb())
    .prepare(
      `SELECT e.*, s.verification_code
       FROM cpd_entries e LEFT JOIN signatures s ON s.id = e.signature_id
       WHERE e.user_id = ? ORDER BY e.activity_date ASC`
    )
    .all(user.id) as (CpdEntry & { verification_code: string | null })[];

  const csv = toCsv(
    [
      "Date",
      "Title",
      "Activity type",
      "Official CPD",
      "Points",
      "Hours",
      "Provider",
      "CPD standard",
      "Evidence",
      "Verification code",
      "Notes",
    ],
    entries.map((e) => [
      e.activity_date,
      e.title,
      e.activity_type,
      e.is_official ? "Yes" : "No",
      e.points,
      e.hours,
      e.provider,
      e.standards,
      e.verified ? "Platform-verified" : "Self-reported",
      e.verification_code,
      e.notes,
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cpd-record.csv"`,
    },
  });
}
