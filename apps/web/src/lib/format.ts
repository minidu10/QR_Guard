import type { AlertType, Severity } from '@qrguard/types';

const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** "LKR 12,500" */
export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK')}`;
}

/** Sri Lanka hour of the day (0-23) for an ISO time. */
export function slHour(iso: string): number {
  return new Date(Date.parse(iso) + SL_OFFSET_MS).getUTCHours();
}

/** "14:05" in Sri Lanka time. */
export function slTime(iso: string): string {
  const d = new Date(Date.parse(iso) + SL_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export const ALERT_LABEL: Record<AlertType, string> = {
  SCAN_MISMATCH: 'Fake QR scanned',
  TAMPER_DETECTED: 'Sticker tampered',
  PAYMENT_DROP: 'Payment drop',
  CUSTOMER_REPORT: 'Customer report',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
