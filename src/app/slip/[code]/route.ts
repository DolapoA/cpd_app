import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getDb, type Register, type Signature } from "@/lib/db";
import { record } from "@/lib/analytics";
import { getBaseUrl } from "@/lib/base-url";
import { formatDate, formatDateTime } from "@/lib/format";

const BRAND = rgb(0.055, 0.43, 0.42);
const INK = rgb(0.086, 0.157, 0.227);
const SOFT = rgb(0.32, 0.4, 0.48);

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const db = await getDb();
  const sig = await db.prepare("SELECT * FROM signatures WHERE verification_code = ?").get(code) as
    | Signature
    | undefined;
  if (!sig) return new NextResponse("Not found", { status: 404 });
  await record({ name: "slip_downloaded" });
  const reg = await db.prepare("SELECT * FROM registers WHERE id = ?").get(sig.register_id) as Register;

  const baseUrl = await getBaseUrl();
  const verifyUrl = `${baseUrl}/verify/${sig.verification_code}`;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 56;

  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: BRAND });

  // The organiser's logo, when their plan carries one. Embedded from the data
  // URL the branding page stored; a failure to parse costs the logo, never
  // the slip — this document is somebody's evidence.
  const branding = (await db
    .prepare("SELECT org_logo FROM users WHERE id = ? AND plan = 'organiser'")
    .get(reg.organiser_id ?? 0)) as { org_logo: string | null } | undefined;
  if (branding?.org_logo) {
    try {
      const [head, b64] = branding.org_logo.split(",", 2);
      const bytes = Buffer.from(b64, "base64");
      const image = head.includes("png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const box = 58;
      const scale = Math.min(box / image.width, box / image.height, 1);
      const w = image.width * scale;
      const h = image.height * scale;
      // A white plate behind it, since most logos are drawn for light grounds.
      page.drawRectangle({
        x: width - margin - w - 8,
        y: height - 74 - 4,
        width: w + 16,
        height: h + 8,
        color: rgb(1, 1, 1),
      });
      page.drawImage(image, { x: width - margin - w, y: height - 74, width: w, height: h });
    } catch (error) {
      console.error("[slip] logo could not be embedded", error);
    }
  }
  page.drawText("CPD ATTENDANCE SLIP", {
    x: margin,
    y: height - 52,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Proof of attendance for continuing professional development", {
    x: margin,
    y: height - 72,
    size: 10,
    font,
    color: rgb(0.85, 0.95, 0.94),
  });

  let y = height - 130;

  const heading = (text: string) => {
    page.drawText(text.toUpperCase(), { x: margin, y, size: 9, font: bold, color: BRAND });
    y -= 18;
  };

  const row = (label: string, value: string | null | undefined) => {
    if (!value) return;
    page.drawText(label, { x: margin, y, size: 10, font, color: SOFT });
    const lines = wrap(value, 62);
    for (const line of lines) {
      page.drawText(line, { x: margin + 150, y, size: 10.5, font: bold, color: INK });
      y -= 15;
    }
    y -= 3;
  };

  const gap = (n = 14) => {
    y -= n;
  };

  heading("Event");
  row("Title", reg.title);
  row("Date", formatDate(reg.event_date));
  row("Time", `${reg.start_time} – ${reg.end_time}`);
  row("Location", reg.location);
  row("Event type", reg.event_type);
  row("Organiser", reg.organiser_name);
  row(
    "CPD status",
    reg.is_official
      ? `Official CPD — ${reg.points ?? "?"} points, accredited by ${reg.accrediting_body}`
      : "Unofficial CPD activity (no external accreditation)"
  );
  if (reg.hours != null) row("Learning hours", String(reg.hours));

  gap();
  heading("Attendee");
  row("Name", sig.full_name);
  row("Email", sig.email);
  row("Professional body", sig.professional_body);
  row("Registration no.", sig.registration_number);
  row("Role / grade", sig.role_grade);
  row("Signed register at", `${formatDateTime(sig.signed_at)} (recorded by server)`);
  row("Capture method", sig.user_id ? "Signed while logged in (platform-verified)" : "Signed as guest");

  if (sig.voided) {
    gap();
    page.drawText("VOIDED BY ORGANISER" + (sig.void_reason ? ` — ${sig.void_reason}` : ""), {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.7, 0.14, 0.09),
    });
    y -= 20;
  }

  gap(24);
  const boxHeight = 74;
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: width - margin * 2,
    height: boxHeight,
    borderColor: BRAND,
    borderWidth: 1,
  });
  page.drawText("VERIFICATION", {
    x: margin + 14,
    y: y - 22,
    size: 9,
    font: bold,
    color: BRAND,
  });
  page.drawText(`Code: ${sig.verification_code}`, {
    x: margin + 14,
    y: y - 40,
    size: 12,
    font: bold,
    color: INK,
  });
  page.drawText(`Confirm this slip is genuine at: ${verifyUrl}`, {
    x: margin + 14,
    y: y - 58,
    size: 9.5,
    font,
    color: SOFT,
  });

  page.drawText(
    "This slip was generated by CPD Register from a time-boxed attendance register. Signatures are timestamped",
    { x: margin, y: 64, size: 8, font, color: SOFT }
  );
  page.drawText(
    "server-side and immutable once submitted. Suitable as supporting evidence for HCPC audit and GMC appraisal.",
    { x: margin, y: 53, size: 8, font, color: SOFT }
  );

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance-slip-${sig.verification_code}.pdf"`,
    },
  });
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
