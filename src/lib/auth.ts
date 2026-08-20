import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, type User } from "./db";
import { newSessionToken } from "./ids";

const SESSION_COOKIE = "cpd_session";
const SESSION_DAYS = 30;

export async function createSession(userId: number): Promise<void> {
  const db = await getDb();
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  // The count is kept here rather than at each of the three call sites —
  // signing up, signing in and finishing a second factor all begin a session,
  // and a counter maintained in three places is one that ends up wrong in one
  // of them. Sent alongside the insert rather than after it: neither needs the
  // other's answer, and a login is not the moment to add a network round trip.
  await Promise.all([
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
      token,
      userId,
      expires.toISOString()
    ),
    db.prepare("UPDATE users SET login_count = login_count + 1 WHERE id = ?").run(userId),
  ]);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await (await getDb())
    .prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, new Date().toISOString()) as User | undefined;
  return row ?? null;
}

/**
 * The user, for a page that needs them signed in *and* reachable by email.
 *
 * An unconfirmed address is not a small gap. Attendance is matched by email,
 * so an account on an address nobody has proved they own could collect
 * somebody else's slips; and a CPD record whose owner cannot be emailed cannot
 * be recovered, which is the one thing a multi-year evidence store must
 * survive. So confirmation is a gate rather than a suggestion.
 *
 * Deliberately not applied to /account, where the address can be corrected and
 * a new link sent — a typo would otherwise lock someone out of the only page
 * that could fix it.
 */
export async function requireConfirmedUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.email_verified_at) redirect("/confirm-email");
  return user;
}
