'use server';

import type { PaymentDropCheck } from '@qrguard/types';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { authedFetch } from '@/lib/auth';

// Demo buttons for the live presentation. The API allows these for admins only.

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: err instanceof ApiError ? err.message : 'Something went wrong.' };
  }
}

const shopId = z.uuid();

export async function addPaymentsAction(id: string, count: number) {
  if (!shopId.safeParse(id).success) return { ok: false, error: 'Pick a shop.' } as const;
  return run(() =>
    authedFetch<{ created: number }>(`/demo/shops/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    }),
  );
}

export async function paymentDropAction(id: string) {
  if (!shopId.safeParse(id).success) return { ok: false, error: 'Pick a shop.' } as const;
  return run(() =>
    authedFetch<PaymentDropCheck & { removed: number }>(`/demo/shops/${id}/payment-drop`, {
      method: 'POST',
    }),
  );
}

export async function resumeAction(id: string) {
  if (!shopId.safeParse(id).success) return { ok: false, error: 'Pick a shop.' } as const;
  return run(() =>
    authedFetch<{ paused: boolean }>(`/demo/shops/${id}/resume`, { method: 'POST' }),
  );
}
