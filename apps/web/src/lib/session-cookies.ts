// Cookie names and options. Shared by server code and the middleware (so no 'server-only').

export const ACCESS_COOKIE = 'qg_access';
export const REFRESH_COOKIE = 'qg_refresh';
export const USER_COOKIE = 'qg_user';

// One minute shorter than the API's 15-minute access token, so the cookie is gone
// (and the middleware refreshes it) before the token itself expires.
export const ACCESS_MAX_AGE = 14 * 60;
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // same as the API's refresh token

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    // Off only for plain-http local Docker. Always on in real production.
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
  };
}
