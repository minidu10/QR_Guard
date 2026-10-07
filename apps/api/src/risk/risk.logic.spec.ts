import { computeRisk, riskLevel } from './risk.logic';

const now = new Date('2026-03-15T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const base = { now, verified: true, alerts: [], openReports: [], lastPhotoAt: hoursAgo(2) };

describe('computeRisk', () => {
  it('is 0 and low for a verified shop with no warning signs', () => {
    expect(computeRisk(base)).toEqual({ score: 0, level: 'low', factors: [] });
  });

  it('adds points for a fresh fake QR scan', () => {
    const r = computeRisk({ ...base, alerts: [{ type: 'SCAN_MISMATCH', createdAt: now }] });
    expect(r.score).toBe(15);
    expect(r.factors[0].label).toBe('1 fake QR scan this week');
  });

  it('makes old signs count less, and 7-day-old signs not at all', () => {
    const half = computeRisk({
      ...base,
      alerts: [{ type: 'TAMPER_DETECTED', createdAt: hoursAgo(84) }],
    });
    expect(half.score).toBe(15); // 30 x 0.5
    const gone = computeRisk({
      ...base,
      alerts: [{ type: 'TAMPER_DETECTED', createdAt: hoursAgo(170) }],
    });
    expect(gone.score).toBe(0);
  });

  it('caps each kind of sign', () => {
    const scans = Array.from({ length: 10 }, () => ({
      type: 'SCAN_MISMATCH' as const,
      createdAt: now,
    }));
    expect(computeRisk({ ...base, alerts: scans }).score).toBe(45);
  });

  it('is high when several things go wrong, and never above 100', () => {
    const r = computeRisk({
      ...base,
      verified: false,
      lastPhotoAt: null,
      alerts: [
        ...Array.from({ length: 3 }, () => ({ type: 'SCAN_MISMATCH' as const, createdAt: now })),
        ...Array.from({ length: 2 }, () => ({ type: 'TAMPER_DETECTED' as const, createdAt: now })),
        { type: 'PAYMENT_DROP' as const, createdAt: now },
      ],
      openReports: [{ createdAt: now }],
    });
    expect(r.score).toBe(100);
    expect(r.level).toBe('high');
    // Biggest reason first.
    expect(r.factors[0].label).toBe('2 tampered sticker photos this week');
  });

  it('adds small points for not verified and no recent photo', () => {
    const r = computeRisk({ ...base, verified: false, lastPhotoAt: hoursAgo(72) });
    expect(r.score).toBe(15);
    expect(r.factors.map((f) => f.label)).toEqual([
      'Shop not verified by the bank yet',
      'No QR stand photo in the last 2 days',
    ]);
  });

  it('counts open customer reports', () => {
    const r = computeRisk({ ...base, openReports: [{ createdAt: now }, { createdAt: now }] });
    expect(r.score).toBe(20);
    expect(r.factors[0].label).toBe('2 open customer reports');
  });
});

describe('riskLevel', () => {
  it('uses 30 and 60 as the borders', () => {
    expect(riskLevel(29)).toBe('low');
    expect(riskLevel(30)).toBe('medium');
    expect(riskLevel(59)).toBe('medium');
    expect(riskLevel(60)).toBe('high');
  });
});
