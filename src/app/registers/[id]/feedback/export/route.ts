import { NextResponse } from "next/server";
import { getDb, type FeedbackResponse, type Register } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/format";
import { FEEDBACK_QUESTIONS } from "@/lib/feedback";

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

  const responses = await db
    .prepare("SELECT * FROM feedback_responses WHERE register_id = ? ORDER BY id ASC")
    .all(reg.id) as FeedbackResponse[];

  const csv = toCsv(
    ["Date", ...FEEDBACK_QUESTIONS.map((q) => q.short), "Comments"],
    responses.map((r) => [r.submitted_on, ...FEEDBACK_QUESTIONS.map((q) => r[q.key]), r.comments])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="feedback-${reg.code}.csv"`,
    },
  });
}
