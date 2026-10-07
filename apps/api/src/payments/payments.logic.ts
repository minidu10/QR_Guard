// Turns raw payment counts into the dashboard summary. Pure, so it is easy to test.
import type { PaymentSummary } from '@qrguard/types';

export interface HourRow {
  hour: number;
  count: number;
  total: number;
}

/**
 * `today`: payments per Sri Lanka hour since midnight.
 * `lastWeek`: payments per hour over the previous `days` days (summed).
 */
export function buildSummary(today: HourRow[], lastWeek: HourRow[], days: number): PaymentSummary {
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: today.find((r) => r.hour === hour)?.count ?? 0,
    // Average for this hour, rounded to 1 decimal.
    typical: Math.round(((lastWeek.find((r) => r.hour === hour)?.count ?? 0) / days) * 10) / 10,
  }));
  return {
    today: {
      count: today.reduce((n, r) => n + r.count, 0),
      total: today.reduce((n, r) => n + r.total, 0),
    },
    hourly,
  };
}
