"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { commitImport, parseImportFile, type ActionState, type ImportPreviewState } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { FileDropzone } from "@/components/file-dropzone";

function Submit({ label, secondary }: { label: string; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn${secondary ? " btn--secondary" : ""}`} disabled={pending}>
      {pending ? "Working…" : label}
    </button>
  );
}

export function ImportForm() {
  const [preview, parseAction] = useActionState<ImportPreviewState, FormData>(parseImportFile, null);
  const [commitState, commitAction] = useActionState<ActionState, FormData>(commitImport, null);

  const hasPreview = preview !== null && !("error" in preview);

  return (
    <>
      <div className="card">
        <h2>1. Upload your spreadsheet</h2>
        <form action={parseAction}>
          <FileDropzone
            id="file"
            name="file"
            accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            extensions={[".csv", ".xlsx", ".xlsm"]}
            prompt="Drop your CSV or Excel file here"
            hint="First row should be column headings."
          />
          {preview !== null && "error" in preview && (
            <p className="form-error" role="alert">
              {preview.error}
            </p>
          )}
          <Submit label={hasPreview ? "Preview a different file" : "Preview import"} secondary={hasPreview} />
        </form>
      </div>

      {hasPreview && (
        <div className="card">
          <h2>2. Check and confirm</h2>
          <p className="muted small">
            <strong>{preview.entries.length}</strong> of {preview.totalRows} rows in{" "}
            <strong>{preview.fileName}</strong> are ready. They&rsquo;ll be added as{" "}
            <span className="badge badge--self">Self-reported</span> and can be deleted later.
          </p>

          {preview.issues.length > 0 && (
            <div className="form-error" role="alert">
              <strong>{preview.issues.length} row{preview.issues.length === 1 ? "" : "s"} will be skipped:</strong>
              <ul className="bullets">
                {preview.issues.slice(0, 10).map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
                {preview.issues.length > 10 && <li>…and {preview.issues.length - 10} more.</li>}
              </ul>
            </div>
          )}

          <div className="table-wrap table-wrap--scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>CPD</th>
                  <th>Provider</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {preview.entries.map((e, i) => (
                  <tr key={i}>
                    <td>{formatDate(e.activity_date)}</td>
                    <td>
                      <strong>{e.title}</strong>
                    </td>
                    <td className="small">{e.activity_type}</td>
                    <td className="small">
                      {e.is_official ? "Official" : "Unofficial"}
                      <div>
                        {e.points != null ? `${e.points} pts` : ""}
                        {e.points != null && e.hours != null ? " · " : ""}
                        {e.hours != null ? `${e.hours} h` : ""}
                      </div>
                    </td>
                    <td className="small">{e.provider ?? "—"}</td>
                    <td className="small">{e.notes ? `${e.notes.slice(0, 80)}${e.notes.length > 80 ? "…" : ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={commitAction}>
            <input type="hidden" name="payload" value={JSON.stringify(preview.entries)} />
            {commitState?.error && (
              <p className="form-error" role="alert">
                {commitState.error}
              </p>
            )}
            <Submit label={`Import ${preview.entries.length} entries into my record`} />
          </form>
        </div>
      )}
    </>
  );
}
