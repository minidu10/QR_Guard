import type { PublicUser, Role } from '@qrguard/types';
import { redirect } from 'next/navigation';
import 'server-only';
import { ApiError, apiFetch } from './api';
import { getAccessToken, getSessionUser } from './session';

/** The logged-in user. Sends visitors to the login page, and other roles home. */
export async function requireUser(roles: Role[]): Promise<PublicUser> {
  const user = await getSessionUser();
  if (!user || !(await getAccessToken())) redirect('/login');
  if (!roles.includes(user.role)) redirect('/');
  return user;
}

/** API call as the logged-in user. A rejected token sends the user to log in again. */
export async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) redirect('/login');
  try {
    return await apiFetch<T>(path, { ...init, token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }
}
