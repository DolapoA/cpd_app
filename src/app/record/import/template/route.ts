import { NextResponse } from "next/server";
import { toCsv } from "@/lib/format";
import { TEMPLATE_HEADERS, TEMPLATE_ROWS } from "@/lib/import-template";

export async function GET() {
  const csv = toCsv(TEMPLATE_HEADERS, TEMPLATE_ROWS);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cpd-import-template.csv"',
    },
  });
}
