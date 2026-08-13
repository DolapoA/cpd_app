"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";

function SubmitButton({
  label,
  large,
  tone,
}: {
  label: string;
  large?: boolean;
  tone?: "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn${large ? " btn--large" : ""}${tone === "danger" ? " btn--danger" : ""}`}
      disabled={pending}
    >
      {pending ? "Working…" : label}
    </button>
  );
}

export function ActionForm({
  action,
  submitLabel,
  largeSubmit,
  /* A destructive action must not look like a save. */
  submitTone,
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  largeSubmit?: boolean;
  submitTone?: "danger";
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction}>
      {children}
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton label={submitLabel} large={largeSubmit} tone={submitTone} />
    </form>
  );
}
