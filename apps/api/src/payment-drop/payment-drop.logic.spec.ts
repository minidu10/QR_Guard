import { checkDrop, dropMessage, dropSeverity } from './payment-drop.logic';

const cfg = { ratio: 0.4, minNormal: 5 };
const week = (n: number) => Array.from({ length: 7 }, () => n);

describe('checkDrop', () => {
  it('finds a drop below 40% of normal', () => {
    const r = checkDrop(3, week(10), cfg);
    expect(r).toMatchObject({ drop: true, reason: 'DROP', current: 3, normal: 10 });
    expect(r.ratio).toBeCloseTo(0.3);
  });

  it('is not a drop at exactly 40%', () => {
    expect(checkDrop(4, week(10), cfg).drop).toBe(false);
  });

  it('is fine at a normal level', () => {
    expect(checkDrop(9, week(10), cfg)).toMatchObject({ drop: false, reason: 'OK' });
  });

  it('ignores quiet hours (normal below 5)', () => {
    expect(checkDrop(0, week(4), cfg)).toMatchObject({ drop: false, reason: 'TOO_FEW' });
  });

  it('averages uneven days', () => {
    // (6+8+10+12+14+6+14) / 7 = 10
    const r = checkDrop(2, [6, 8, 10, 12, 14, 6, 14], cfg);
    expect(r.normal).toBe(10);
    expect(r.drop).toBe(true);
  });

  it('handles no history', () => {
    expect(checkDrop(0, [], cfg)).toMatchObject({ drop: false, reason: 'TOO_FEW', ratio: null });
  });

  it('uses the thresholds from config', () => {
    expect(checkDrop(5, week(10), { ratio: 0.6, minNormal: 5 }).drop).toBe(true);
    expect(checkDrop(0, week(4), { ratio: 0.4, minNormal: 3 }).drop).toBe(true);
  });
});

describe('dropSeverity and dropMessage', () => {
  it('is high for a very big drop', () => {
    expect(dropSeverity(0.1)).toBe('high');
    expect(dropSeverity(0.3)).toBe('medium');
    expect(dropSeverity(null)).toBe('medium');
  });

  it('explains the numbers in simple words', () => {
    expect(dropMessage(checkDrop(1, week(10), cfg))).toContain('only 1 in the last hour');
  });
});
