import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ImportForm } from "@/components/import-form";
import { TEMPLATE_COLUMNS, TEMPLATE_ROWS } from "@/lib/import-template";
import { frameworkFor } from "@/lib/standards";

export const metadata = { title: "Import CPD record — CPD Register" };

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const framework = frameworkFor(user.regulator);

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Import your existing CPD record</h1>

        </div>
        <a href="/record/import/template" className="btn btn--secondary">
          Download CSV template
        </a>
      </div>

      <div className="card">
        <h2>An example spreadsheet</h2>
        <div className="sheet-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__rownum" aria-hidden="true">
                  1
                </th>
                {TEMPLATE_COLUMNS.map((column, i) => (
                  <th key={column.name}>
                    <span className="sheet__col">{String.fromCharCode(65 + i)}</span>
                    {column.name}
                    {column.required && (
                      <abbr className="sheet__required" title="Required">
                        *
                      </abbr>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEMPLATE_ROWS.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="sheet__rownum" aria-hidden="true">
                    {rowIndex + 2}
                  </td>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="small">
          <abbr className="sheet__required" title="Required">
            *
          </abbr>{" "}
          <strong>Only Date and Title are required.</strong> Leave anything else blank, like
          Points in the last two rows.
        </p>

      </div>

      <ImportForm />
    </main>
  );
}
