// Shop risk score: 0 (safe) to 100 (high risk). Pure, so it is easy to test.
//
// Recent warning signs add points. Each sign fades out over 7 days, so a shop that
// fixed its problem goes back to "low" on its own.
import type { AlertType, RiskFactor, RiskLevel } from '@qrguard/types';

export const RISK_WINDOW_HOURS = 7 * 24;

// Points for one fresh sign, and the most one kind of sign can add.
const WEIGHTS: Record<Exclude<AlertType, 'CUSTOMER_REPORT'>, { each: number; max: number }> = {
  SCAN_MISMATCH: { each: 15, max: 45 },
  TAMPER_DETECTED: { each: 30, max: 60 },
  PAYMENT_DROP: { each: 20, max: 40 },
};
const REPORT = { each: 10, max: 30 };
const NOT_VERIFIED = 10;
const NO_RECENT_PHOTO = 5;
const PHOTO_EVERY_HOURS = 48;

const LABEL: Record<keyof typeof WEIGHTS, (n: number) => string> = {
  SCAN_MISMATCH: (n) => `${n} fake QR scan${n === 1 ? '' : 's'} this week`,
  TAMPER_DETECTED: (n) => `${n} tampered sticker photo${n === 1 ? '' : 's'} this week`,
  PAYMENT_DROP: (n) => `${n} payment drop${n === 1 ? '' : 's'} this week`,
};

export interface RiskInput {
  now: Date;
  verified: boolean;
  /** Alerts from the last 7 days (customer reports are counted from `openReports`). */
  alerts: { type: AlertType; createdAt: Date }[];
  /** Reports that are still open or being reviewed. */
  openReports: { createdAt: Date }[];
  lastPhotoAt: Date | null;
}

export interface Risk {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

/** 1 for a sign from right now, falling to 0 after 7 days. */
function fade(at: Date, now: Date): number {
  const hours = (now.getTime() - at.getTime()) / 3_600_000;
  return Math.max(0, 1 - hours / RISK_WINDOW_HOURS);
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export function computeRisk(input: RiskInput): Risk {
  const { now } = input;
  const factors: RiskFactor[] = [];
  const add = (label: string, points: number) => {
    const p = Math.round(points);
    if (p > 0) factors.push({ label, points: p });
  };

  for (const type of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    const recent = input.alerts.filter((a) => a.type === type && fade(a.createdAt, now) > 0);
    const raw = recent.reduce((sum, a) => sum + WEIGHTS[type].each * fade(a.createdAt, now), 0);
    if (recent.length) add(LABEL[type](recent.length), Math.min(WEIGHTS[type].max, raw));
  }

  const reports = input.openReports.filter((r) => fade(r.createdAt, now) > 0);
  const reportPoints = reports.reduce((sum, r) => sum + REPORT.each * fade(r.createdAt, now), 0);
  if (reports.length) {
    add(
      `${reports.length} open customer report${reports.length === 1 ? '' : 's'}`,
      Math.min(REPORT.max, reportPoints),
    );
  }

  if (!input.verified) add('Shop not verified by the bank yet', NOT_VERIFIED);
  const photoAge = input.lastPhotoAt
    ? (now.getTime() - input.lastPhotoAt.getTime()) / 3_600_000
    : Infinity;
  if (photoAge > PHOTO_EVERY_HOURS) add('No QR stand photo in the last 2 days', NO_RECENT_PHOTO);

  factors.sort((a, b) => b.points - a.points);
  const score = Math.min(
    100,
    factors.reduce((sum, f) => sum + f.points, 0),
  );
  return { score, level: riskLevel(score), factors };
}
