'use server';

import type { Alert, GeneratedQrCode, RealtimeTicket, Shop } from '@qrguard/types';
import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { authedFetch } from '@/lib/auth';
import { fieldErrors, type FormState } from '@/lib/validation';

/** Short ticket that lets the browser open the live connection. Null if not allowed. */
export async function realtimeTicketAction(): Promise<string | null> {
  try {
    const res = await authedFetch<Pick<RealtimeTicket, 'ticket'>>('/realtime/ticket', {
      method: 'POST',
    });
    return res.ticket;
  } catch {
    return null;
  }
}

export async function markAlertReadAction(alertId: string): Promise<Alert | null> {
  if (!z.uuid().safeParse(alertId).success) return null;
  try {
    return await authedFetch<Alert>(`/alerts/${alertId}/read`, { method: 'PATCH' });
  } catch {
    return null;
  }
}

/** Makes a new QR code and stops the old ones working (e.g. after a sticker was tampered). */
export async function rotateQrAction(shopId: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(shopId).success) return { error: 'Unknown shop.' };
  try {
    await authedFetch<GeneratedQrCode>(`/shops/${shopId}/qrcodes`, {
      method: 'POST',
      body: JSON.stringify({ rotate: true }),
    });
  } catch (err) {
    unstable_rethrow(err); // let a 'log in again' redirect through
    return { error: err instanceof ApiError ? err.message : 'Could not make a new QR code.' };
  }
  revalidatePath('/dashboard');
  return {};
}

const shopSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  address: z.string().trim().min(5, 'Address is too short').max(200),
  // Sri Lanka only (same box as the API).
  lat: z.coerce.number().min(5.8, 'Must be in Sri Lanka').max(10, 'Must be in Sri Lanka'),
  lng: z.coerce.number().min(79.5, 'Must be in Sri Lanka').max(82, 'Must be in Sri Lanka'),
});

/** Creates a shop and its first QR code, then opens it on the dashboard. */
export async function createShopAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ['name', 'address', 'lat', 'lng'].map((k) => [k, String(form.get(k) ?? '')]),
  );
  const parsed = shopSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  let shop: Shop;
  try {
    shop = await authedFetch<Shop>('/shops', { method: 'POST', body: JSON.stringify(parsed.data) });
    await authedFetch<GeneratedQrCode>(`/shops/${shop.id}/qrcodes`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } catch (err) {
    unstable_rethrow(err);
    return { error: err instanceof ApiError ? err.message : 'Could not create the shop.', values };
  }
  redirect(`/dashboard?shop=${shop.id}`);
}
