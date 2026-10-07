// Payment drop rule. Pure functions, so they are easy to test.
//
// We compare the last 60 minutes with the same 60 minutes on each of the last few days.
// (A rolling window, so a check at 10:15 compares 9:15-10:15 with 9:15-10:15 on other days.)
// If payments fell below a share of normal, a fake QR may be taking the shop's money.
import type { PaymentDropResult, Severity } from '@qrguard/types';

export interface DropConfig {
  /** Alert when current < ratio x normal (e.g. 0.4 = 40%). */
  ratio: number;
  /** Ignore quiet times: normal must be at least this many payments. */
  minNormal: number;
}

/**
 * current = payments in the last 60 minutes. normal = average for the same 60 minutes
 * on previous days. ratio = current / normal (null when normal is 0).
 */
export type DropResult = PaymentDropResult;

export function checkDrop(current: number, history: number[], cfg: DropConfig): DropResult {
  const normal = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0;
  const rounded = Math.round(normal * 10) / 10;
  const ratio = normal > 0 ? current / normal : null;
  if (normal < cfg.minNormal) {
    return { drop: false, current, normal: rounded, ratio, reason: 'TOO_FEW' };
  }
  const drop = current < cfg.ratio * normal;
  return { drop, current, normal: rounded, ratio, reason: drop ? 'DROP' : 'OK' };
}

/** A very big drop is more serious. */
export function dropSeverity(ratio: number | null): Severity {
  return ratio !== null && ratio < 0.15 ? 'high' : 'medium';
}

export function dropMessage(r: DropResult): string {
  return `Payments dropped: only ${r.current} in the last hour, but normal is about ${Math.round(r.normal)}. A fake QR sticker may be taking your customers' money. Check your QR stand now.`;
}
