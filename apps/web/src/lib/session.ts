import type { AuthResponse, PublicUser } from '@qrguard/types';
import { cookies } from 'next/headers';
import 'server-only';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  cookieOptions,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  USER_COOKIE,
} from './session-cookies';

// Tokens live in httpOnly cookies, so page JavaScript can never read them.

export async function saveSession(auth: AuthResponse) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, auth.accessToken, cookieOptions(ACCESS_MAX_AGE));
  jar.set(REFRESH_COOKIE, auth.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  // Only used to show the name/role in the UI. The API checks the real token.
  jar.set(USER_COOKIE, JSON.stringify(auth.user), cookieOptions(REFRESH_MAX_AGE));
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) jar.delete(name);
}

/** The access token for API calls, or undefined if not logged in. */
export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

/** The logged-in user for display, or null. */
export async function getSessionUser(): Promise<PublicUser | null> {
  const raw = (await cookies()).get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}
