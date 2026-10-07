'use server';

import type { NearbyShop, Payment, ScanResponse } from '@qrguard/types';
import { z } from 'zod';
import { ApiError, apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

const scanSchema = z.object({
  qrPayload: z.string().min(1).max(512),
  shopId: z.uuid().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export type ScanInput = z.input<typeof scanSchema>;
export type ScanActionResult = { ok: true; result: ScanResponse } | { ok: false; error: string };

/** Sends a scanned QR to the API. Works with or without login. */
export async function scanAction(input: ScanInput): Promise<ScanActionResult> {
  const parsed = scanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'This QR code could not be read. Please try again.' };
  }
  try {
    const result = await apiFetch<ScanResponse>('/scan', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
      token: await getAccessToken(),
    });
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : 'Could not check the QR code.',
    };
  }
}

/** Shops near the customer, closest first. Empty list if anything goes wrong. */
export async function nearbyShopsAction(lat: number, lng: number): Promise<NearbyShop[]> {
  const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
  if (!point.safeParse({ lat, lng }).success) return [];
  try {
    return await apiFetch<NearbyShop[]>(`/shops/nearby?lat=${lat}&lng=${lng}&radius=300`);
  } catch {
    return [];
  }
}

const paySchema = z.object({
  merchantId: z.string().regex(/^[A-Za-z0-9.-]{1,32}$/),
  amount: z.number().int().min(10).max(100000),
});

/** Fake payment to the scanned merchant (demo only). */
export async function payAction(
  merchantId: string,
  amount: number,
): Promise<{ ok: true; payment: Payment } | { ok: false; error: string }> {
  const parsed = paySchema.safeParse({ merchantId, amount });
  if (!parsed.success) return { ok: false, error: 'Enter a valid amount.' };
  try {
    const payment = await apiFetch<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    return { ok: true, payment };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Payment failed.' };
  }
}
