import { NextResponse } from "next/server";
import { getDb, type Register, type Signature } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/format";
import { parseJsonArray } from "@/lib/entitlements";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorised", { status: 401 });
  // A data endpoint answers rather than redirects: a browser download that
  // silently returned an HTML page would look like a corrupt file.
  if (!user.email_verified_at)
    return new NextResponse("Confirm your email address before exporting.", { status: 403 });

  const { id } = await ctx.params;
  const db = await getDb();
  const reg = await db.prepare("SELECT * FROM registers WHERE id = ?").get(Number(id)) as
    | Register
    | undefined;
  if (!reg || reg.organiser_id !== user.id) return new NextResponse("Not found", { status: 404 });

  const signatures = await db
    .prepare("SELECT * FROM signatures WHERE register_id = ? ORDER BY signed_at ASC")
    .all(reg.id) as Signature[];

  // One column per extra question this register asked, answers aligned by the
  // question text so a register edited mid-event still exports coherently.
  const questions = parseJsonArray<string>(reg.custom_fields);
  const answersFor = (s: Signature) => {
    const got = parseJsonArray<{ q: string; a: string }>(s.custom_answers);
    return questions.map((q) => got.find((x) => x.q === q)?.a ?? "");
  };

  const csv = toCsv(
    [
      "Full name",
      "Email",
      "Professional body",
      "Registration number",
      "Role/grade",
      "Signed at (UTC)",
      "Verification code",
      "Account holder",
      "Status",
      "Void reason",
      ...questions,
    ],
    signatures.map((s) => [
      s.full_name,
      s.email,
      s.professional_body,
      s.registration_number,
      s.role_grade,
      s.signed_at,
      s.verification_code,
      s.user_id ? "Yes" : "No",
      s.voided ? "VOIDED" : "Valid",
      s.void_reason,
      ...answersFor(s),
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="register-${reg.code}-signatures.csv"`,
    },
  });
}
