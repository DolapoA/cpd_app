import Link from "next/link";
import { redirect } from "next/navigation";
import { signup } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, REGULATORS } from "@/lib/format";
import { getGuestSlip } from "@/lib/guest-signature";
import { ActionForm } from "@/components/action-form";
import { ProfessionField } from "@/components/profession-field";
import { GuestGoalsField } from "@/components/guest-goals-field";

export const metadata = { title: "Create account — CPD Register" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  // Someone who has just signed a register gets their details carried over,
  // so all that is left to enter is a password.
  const slip = await getGuestSlip();
  const known = slip?.signature;
  // Only pre-select the regulator if what they typed matches one we know.
  const knownRegulator =
    known?.professional_body && (REGULATORS as readonly string[]).includes(known.professional_body)
      ? known.professional_body
      : "";

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>{slip ? "Keep this on your record" : "Create your account"}</h1>
          <p>
            {slip
              ? "Your details are already filled in — just choose a password."
              : "Slips already issued to this email will be added to your record."}
          </p>
        </div>
      </div>

      {slip && (
        <div className="notice notice--info">
          <p className="small">
            <strong>{slip.register.title}</strong> on {formatDate(slip.register.event_date)} will
            be saved to your CPD record as{" "}
            <span className="badge badge--verified">Platform-verified</span> — the strongest kind
            of evidence, because it was captured live on the register rather than typed in
            afterwards.
          </p>
          <p className="small">
            Any other slips issued to <strong>{known?.email}</strong> come across at the same time,
            and every future event you sign is added automatically.
          </p>
        </div>
      )}

      <div className="card">
        <ActionForm
          action={signup}
          submitLabel={slip ? "Create account and save it" : "Create account"}
        >
          <GuestGoalsField />
          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              defaultValue={known?.full_name ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={known?.email ?? ""}
            />
            {slip && (
              <div className="hint">
                The address you signed with. Change it if you would rather use another — your slip
                still comes with you.
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <div className="hint">At least 8 characters.</div>
          </div>
          <div className="field-row">
            <ProfessionField />
            <div className="field">
              <label htmlFor="regulator">Regulator</label>
              <select id="regulator" name="regulator" defaultValue={knownRegulator}>
                <option value="">Choose…</option>
                {REGULATORS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <div className="hint">
                Not listed? Choose &ldquo;Other&rdquo;. This sets which compliance packs you get.
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="registration_number">Registration number</label>
            <input
              id="registration_number"
              name="registration_number"
              type="text"
              placeholder="e.g. PH123456 or 1234567"
              defaultValue={known?.registration_number ?? ""}
            />
            <div className="hint">Optional. Pre-fills registers you sign.</div>
          </div>
        </ActionForm>
      </div>
      <p className="muted small">
        Already have an account? <Link href="/login">Log in</Link>
        {slip ? " — your slip will be added to it." : "."}
      </p>
    </main>
  );
}
