'use server';

import type { AuthResponse } from '@qrguard/types';
import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { clearSession, saveSession } from '@/lib/session';
import { fieldErrors, type FormState, loginSchema, registerSchema } from '@/lib/validation';

// Owners and admins start on their dashboard. Customers start on the home page.
function homeFor(auth: AuthResponse): string {
  return auth.user.role === 'customer' ? '/' : '/dashboard';
}

// Keep typed values (never the password) so the form is not wiped on error.
function keep(form: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? '')]));
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, ['email']);
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  let auth: AuthResponse;
  try {
    auth = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    await saveSession(auth);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Login failed.', values };
  }
  redirect(homeFor(auth));
}

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, ['name', 'email', 'phone', 'role']);
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  let auth: AuthResponse;
  try {
    auth = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    await saveSession(auth);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Sign up failed.', values };
  }
  redirect(homeFor(auth));
}

export async function logoutAction() {
  await clearSession();
  redirect('/');
}
