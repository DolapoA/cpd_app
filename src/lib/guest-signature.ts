import "server-only";
import { cookies } from "next/headers";
import { getDb, type Register, type Signature } from "./db";

/**
 * Remembers the slip a guest has just been issued, so the sign-up form can be
 * filled in for them instead of asking for details they have already typed.
 *
 * The verification code is deliberately NOT passed through the URL. It is
 * printed on the PDF slip and /verify/[code] is public, so a code in a link
 * would let anyone holding one read the attendee's email address — which the
 * verify page is careful not to expose. A cookie is held only by the person
 * who actually signed.
 */
const COOKIE = "cpd_guest_slip";
const HOURS = 48;

export type GuestSlip = {
  signature: Signature;
  register: Register;
};

export async function rememberGuestSlip(verificationCode: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, verificationCode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + HOURS * 60 * 60 * 1000),
    path: "/",
  });
}

export async function forgetGuestSlip(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The remembered slip, if it is still unclaimed and still valid. */
export async function getGuestSlip(): Promise<GuestSlip | null> {
  const code = (await cookies()).get(COOKIE)?.value;
  if (!code) return null;

  const db = await getDb();
  const signature = await db
    .prepare("SELECT * FROM signatures WHERE verification_code = ?")
    .get(code) as Signature | undefined;
  // Already attached to an account, or voided: nothing left to offer.
  if (!signature || signature.user_id !== null || signature.voided) return null;

  const register = await db
    .prepare("SELECT * FROM registers WHERE id = ?")
    .get(signature.register_id) as Register | undefined;
  if (!register) return null;

  return { signature, register };
}

/** The code alone, for claiming at sign-up without a second lookup. */
export async function getGuestSlipCode(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}
