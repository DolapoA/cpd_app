"use client";

import { useState } from "react";

/**
 * A long address shown for copying.
 *
 * A calendar URL has to be pasted into a different app, and it is 80-odd
 * characters of random token — the one kind of value nobody can retype
 * correctly. Selecting it by hand on a phone is worse still, so the button is
 * the point of this component, not decoration.
 */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused, and an insecure origin has no API at
      // all. Selecting the text leaves the user one keystroke from copying it
      // rather than stranded with a button that did nothing.
      const el = document.getElementById("copy-field-value") as HTMLInputElement | null;
      el?.select();
    }
  }

  return (
    <div className="field">
      <label htmlFor="copy-field-value">{label}</label>
      <div className="field-row">
        <input
          id="copy-field-value"
          className="mono"
          type="text"
          value={value}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="field field--action">
          <button type="button" className="btn btn--secondary" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
