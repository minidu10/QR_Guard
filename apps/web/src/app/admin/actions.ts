'use server';

import type { Report, ReportStatus, Shop } from '@qrguard/types';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { authedFetch } from '@/lib/auth';

const id = z.uuid();
const status = z.enum(['open', 'reviewing', 'resolved', 'dismissed']);

/** Bank team marks a shop as checked (verified) or not. */
export async function verifyShopAction(shopId: string, verified: boolean) {
  if (!id.safeParse(shopId).success) return { error: 'Unknown shop.' };
  try {
    await authedFetch<Shop>(`/admin/shops/${shopId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verified }),
    });
  } catch (err) {
    unstable_rethrow(err);
    return { error: err instanceof ApiError ? err.message : 'Could not update the shop.' };
  }
  revalidatePath('/admin');
  return {};
}

export async function setReportStatusAction(reportId: string, next: ReportStatus) {
  if (!id.safeParse(reportId).success || !status.safeParse(next).success) {
    return { error: 'Unknown report.' };
  }
  try {
    await authedFetch<Report>(`/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });
  } catch (err) {
    unstable_rethrow(err);
    return { error: err instanceof ApiError ? err.message : 'Could not update the report.' };
  }
  revalidatePath('/admin');
  return {};
}
