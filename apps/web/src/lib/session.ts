import type { AuthResponse, PublicUser } from '@qrguard/types';
import { cookies } from 'next/headers';
import 'server-only';

// Tokens live in httpOnly cookies, so page JavaScript can never read them.
const ACCESS = 'qg_access';
const REFRESH = 'qg_refresh';
const USER = 'qg_user';

const ACCESS_MAX_AGE = 15 * 60; // same as the API's access token (15 min)
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

const base = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  // Off only for plain-http local Docker. Always on in real production.
  secure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production',
};

export async function saveSession(auth: AuthResponse) {
  const jar = await cookies();
  jar.set(ACCESS, auth.accessToken, { ...base, maxAge: ACCESS_MAX_AGE });
  jar.set(REFRESH, auth.refreshToken, { ...base, maxAge: REFRESH_MAX_AGE });
  // Only used to show the name/role in the UI. The API checks the real token.
  jar.set(USER, JSON.stringify(auth.user), { ...base, maxAge: REFRESH_MAX_AGE });
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of [ACCESS, REFRESH, USER]) jar.delete(name);
}

/** The access token for API calls, or undefined if not logged in. */
export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS)?.value;
}

/** The logged-in user for display, or null. */
export async function getSessionUser(): Promise<PublicUser | null> {
  const raw = (await cookies()).get(USER)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}
