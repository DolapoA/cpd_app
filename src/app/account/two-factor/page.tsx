import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { confirmTwoFactor, dismissRecoveryCodes, regenerateRecoveryCodes } from "@/lib/actions";
import { RECOVERY_FLASH_COOKIE } from "@/lib/totp";
import { provisioningUri, unusedRecoveryCount } from "@/lib/totp";
import { ActionForm } from "@/components/action-form";
import { CodeField } from "@/components/code-field";

export const metadata = { title: "Two-factor authentication — CPD Register" };

export default async function TwoFactorSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.totp_secret) redirect("/account");

  // Codes are shown once, in the response that issued them. They are stored
  // hashed, so this page cannot show them again later — which is the point.
  const justIssued = (await searchParams).new === "1";
  const flash = justIssued ? (await cookies()).get(RECOVERY_FLASH_COOKIE)?.value : undefined;
  const codes = flash ? flash.split(",") : [];

  const remaining = user.totp_confirmed_at ? await unusedRecoveryCount(user.id) : 0;
  const uri = provisioningUri(user.totp_secret, user.email);
  const qr = await QRCode.toDataURL(uri, { width: 360, margin: 1 });

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Two-factor authentication</h1>
          <p>
            A six-digit code from your phone, on top of your password. Someone who learns your
            password still cannot get in.
          </p>
        </div>
      </div>

      {codes.length > 0 && (
        <div className="card card--warn">
          <h2>Save these recovery codes now</h2>
          <p className="small">
            Each one signs you in once if you lose your phone. They will not be shown again.
            Print them, or put them somewhere that isn&rsquo;t the phone with the app on it.
          </p>
          <ul className="mono bullets bullets--tight">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <form action={dismissRecoveryCodes}>
            <button type="submit" className="btn">
              I&rsquo;ve saved them
            </button>
          </form>
        </div>
      )}

      {user.totp_confirmed_at ? (
        <>
          <div className="notice notice--ok">
            <h3 className="notice__title">Two-factor authentication is on</h3>
            <p className="small">
              You will be asked for a code each time you sign in. You have{" "}
              <strong>{remaining}</strong> unused recovery {remaining === 1 ? "code" : "codes"}.
            </p>
          </div>

          <div className="card">
            <h2>Recovery codes</h2>
            <p className="muted small">
              Each code works once, and is the way back in if you lose your phone. Generating a
              new set immediately cancels the old one.
            </p>
            <form action={regenerateRecoveryCodes}>
              <button type="submit" className="btn btn--secondary">
                Generate new codes
              </button>
            </form>
          </div>

          <p className="muted small">
            <Link href="/account">← Back to your account</Link>
          </p>
        </>
      ) : (
        <>
          <div className="card">
            <h2>1. Scan this with your authenticator app</h2>
            <p className="muted small">
              Google Authenticator, Microsoft Authenticator, 1Password, Authy — any of them.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code for setting up two-factor authentication" width={200} height={200} />
            <p className="small">
              {/* The QR is for a second device; on the phone itself this link
                  opens the authenticator directly, and codes saved this way
                  are the ones iPhones later offer to fill in by themselves. */}
              On this phone? <a href={uri}>Open your authenticator app instead</a>.
            </p>
            <p className="muted small">
              Can&rsquo;t scan? Type this key in instead:
            </p>
            <p className="mono prewrap">{user.totp_secret}</p>
          </div>

          <div className="card">
            <h2>2. Enter the code it shows</h2>
            <p className="muted small">
              This proves the app is set up correctly before anything is switched on.
            </p>
            <ActionForm action={confirmTwoFactor} submitLabel="Turn on two-factor">
              <CodeField label="Six-digit code" />
            </ActionForm>
          </div>

          <p className="muted small">
            Nothing has changed yet — leave this page and you can still sign in with your password
            alone. <Link href="/account">Back to your account</Link>
          </p>
        </>
      )}
    </main>
  );
}
