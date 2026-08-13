"use client";

import { useEffect, useRef, useState } from "react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  id,
  name,
  accept,
  extensions,
  prompt,
  hint,
}: {
  id: string;
  name: string;
  /** Passed to the native input so the file picker filters sensibly. */
  accept: string;
  /** Lower-case extensions (with dot) accepted on drop, e.g. [".csv", ".xlsx"]. */
  extensions: string[];
  prompt: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // dragenter/dragleave also fire when crossing child elements, so track depth
  // rather than toggling on every event.
  const depth = useRef(0);

  // Without this, dropping slightly wide of the zone makes the browser navigate
  // away to the file — losing whatever the user had already filled in.
  useEffect(() => {
    const swallow = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  function accepts(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return extensions.some((ext) => lower.endsWith(ext));
  }

  function rejectionMessage(fileName: string): string {
    if (fileName.toLowerCase().endsWith(".xls")) {
      return "Legacy .xls files aren’t supported — open it in Excel and save as .xlsx or .csv.";
    }
    return `That file type isn’t supported. Drop a ${extensions.join(" or ")} file.`;
  }

  function take(dropped: File | undefined) {
    if (!dropped) return;
    if (!accepts(dropped.name)) {
      setError(rejectionMessage(dropped.name));
      return;
    }
    // Assigning through DataTransfer keeps the native input as the real form
    // control, so the file posts exactly as if it had been picked by hand.
    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFile({ name: dropped.name, size: dropped.size });
    setError(null);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
    setError(null);
  }

  return (
    <div className="field">
      <div
        className={`dropzone${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          depth.current -= 1;
          if (depth.current <= 0) {
            depth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          take(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          className="dropzone__input"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (!picked) return clear();
            if (!accepts(picked.name)) {
              setError(rejectionMessage(picked.name));
              clear();
              return;
            }
            setFile({ name: picked.name, size: picked.size });
            setError(null);
          }}
        />

        <label htmlFor={id} className="dropzone__target">
          {file ? (
            <>
              <span className="dropzone__icon" aria-hidden="true">
                ✓
              </span>
              <span className="dropzone__title">{file.name}</span>
              <span className="dropzone__sub">
                {formatSize(file.size)} · choose or drop another file to replace it
              </span>
            </>
          ) : (
            <>
              <span className="dropzone__icon" aria-hidden="true">
                ⬆
              </span>
              <span className="dropzone__title">
                {dragging ? "Drop the file to upload" : prompt}
              </span>
              <span className="dropzone__sub">
                Drag and drop, or <span className="dropzone__link">browse your files</span>
              </span>
            </>
          )}
        </label>

        {file && (
          <button type="button" className="btn btn--secondary btn--small" onClick={clear}>
            Remove
          </button>
        )}
      </div>

      {/* Announced to screen readers when the selection changes, since the
          visual confirmation above is not otherwise reported. */}
      <p className="sr-only" role="status">
        {file ? `${file.name} selected, ${formatSize(file.size)}` : "No file selected"}
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
