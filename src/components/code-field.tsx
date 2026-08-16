/**
 * The input for a one-time code.
 *
 * Split out because getting this wrong is the whole experience: on a phone the
 * digits should bring up the number pad, the browser should offer the code it
 * just saw in an SMS or clipboard, and a password manager must not treat a
 * short text field next to a sign-in form as a username to fill.
 */
export function CodeField({ label, recovery }: { label: string; recovery?: boolean }) {
  return (
    <div className="field">
      <label htmlFor="code">{label}</label>
      <input
        id="code"
        name="code"
        type="text"
        required
        // Six digits: the numeric keypad, not the full keyboard.
        inputMode={recovery ? "text" : "numeric"}
        pattern={recovery ? undefined : "[0-9]*"}
        maxLength={recovery ? 11 : 6}
        // The one place autofill genuinely helps — browsers offer the code
        // from a notification. Recovery codes are typed from paper, so no.
        autoComplete={recovery ? "off" : "one-time-code"}
        autoFocus
        autoCapitalize={recovery ? "characters" : "off"}
        autoCorrect="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        data-bwignore
        data-form-type="other"
      />
    </div>
  );
}
