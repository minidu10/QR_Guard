'use server';

import type { Report } from '@qrguard/types';
import { z } from 'zod';
import { ApiError, apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/session';
import type { FormState } from '@/lib/validation';

const reportSchema = z.object({
  scanId: z.uuid().optional(),
  description: z
    .string()
    .trim()
    .min(5, 'Please write a few words (at least 5 letters).')
    .max(500, 'Please keep it under 500 letters.'),
});

export type ReportState = FormState & { done?: boolean };

/** A customer reports a suspicious QR code. Works with or without login. */
export async function reportAction(_prev: ReportState, form: FormData): Promise<ReportState> {
  const values = { description: String(form.get('description') ?? '') };
  const scanId = String(form.get('scanId') ?? '') || undefined;
  const parsed = reportSchema.safeParse({ ...values, scanId });
  if (!parsed.success) {
    return { fieldErrors: { description: parsed.error.issues[0]?.message }, values };
  }
  try {
    await apiFetch<Report>('/reports', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
      token: await getAccessToken(),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Could not send the report.', values };
  }
  return { done: true };
}
