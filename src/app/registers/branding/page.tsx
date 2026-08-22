import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConfirmedUser } from "@/lib/auth";
import { isOrganiserPlan } from "@/lib/entitlements";
import { removeOrgLogo, uploadOrgLogo } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Your branding — CPD Register" };

export default async function BrandingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireConfirmedUser();
  // Not forbidden — absent. A plan feature a free account cannot reach should
  // not confirm its own existence at a guessable URL.
  if (!isOrganiserPlan(user)) notFound();
  const { saved } = await searchParams;

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Your branding</h1>
          <p>
            Shown on the sign-in page, the projector and every slip your events issue.{" "}
            <Link href="/registers">Back to your registers</Link>
          </p>
        </div>
      </div>

      {saved === "1" && (
        <div className="notice notice--ok">
          <p className="small">Saved. It appears on slips issued from now on.</p>
        </div>
      )}

      {user.org_logo && (
        <div className="card stack">
          <h2>Current logo</h2>
          {/* An img with a data URL, exactly as the slip will embed it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.org_logo} alt="Your logo" className="org-logo-preview" />
          <form action={removeOrgLogo}>
            <button type="submit" className="btn btn--quiet btn--small">
              Remove it
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>{user.org_logo ? "Replace it" : "Add a logo"}</h2>
        <ActionForm action={uploadOrgLogo} submitLabel="Save logo">
          <div className="field">
            <label htmlFor="logo">Logo file</label>
            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" required />
            <div className="hint">PNG or JPEG, under 300KB. Square or wide works best.</div>
          </div>
        </ActionForm>
      </div>
    </main>
  );
}
