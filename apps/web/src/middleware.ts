import type { AuthResponse } from '@qrguard/types';
import { type NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  cookieOptions,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  USER_COOKIE,
} from '@/lib/session-cookies';

const API_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

// Keeps users logged in: when the short access token is gone but the refresh token
// is still there, swap the refresh token for a new pair before the page renders.
export async function middleware(req: NextRequest) {
  const hasAccess = req.cookies.has(ACCESS_COOKIE);
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  // Link prefetches skip this, so two requests never use the same refresh token
  // (the API treats a re-used refresh token as stolen and logs the user out).
  const isPrefetch =
    req.headers.get('next-router-prefetch') === '1' || req.headers.get('purpose') === 'prefetch';
  if (hasAccess || !refreshToken || isPrefetch) return NextResponse.next();

  let auth: AuthResponse | null = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (res.ok) auth = (await res.json()) as AuthResponse;
  } catch {
    // API down: carry on as logged out for this request.
  }

  if (!auth) {
    const res = NextResponse.next();
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) res.cookies.delete(name);
    return res;
  }

  // Let this request see the new tokens, and save them in the browser.
  req.cookies.set(ACCESS_COOKIE, auth.accessToken);
  req.cookies.set(REFRESH_COOKIE, auth.refreshToken);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(ACCESS_COOKIE, auth.accessToken, cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH_COOKIE, auth.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  res.cookies.set(USER_COOKIE, JSON.stringify(auth.user), cookieOptions(REFRESH_MAX_AGE));
  return res;
}

export const config = {
  // Pages and server actions only. Not static files, icons or health checks.
  matcher: ['/((?!_next/static|_next/image|icons/|sw.js|manifest.webmanifest|health|icon.svg).*)'],
};
