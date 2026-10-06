import { fakePayments, makeRandom } from './payments';

describe('fakePayments', () => {
  const now = new Date('2026-03-15T12:00:00Z');
  const make = () => fakePayments({ days: 14, perHour: 5, now, random: makeRandom(42) });

  it('makes the same data for the same seed', () => {
    expect(make()).toEqual(make());
  });

  it('keeps every payment inside the last 14 days, sorted by time', () => {
    const list = make();
    const from = now.getTime() - 14 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;
    expect(list.length).toBeGreaterThan(500);
    for (let i = 0; i < list.length; i++) {
      expect(list[i].createdAt.getTime()).toBeGreaterThanOrEqual(from);
      expect(list[i].createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      if (i > 0) expect(list[i].createdAt >= list[i - 1].createdAt).toBe(true);
    }
  });

  it('has no payments at night (Sri Lanka time)', () => {
    for (const p of make()) {
      const localHour = new Date(p.createdAt.getTime() + 5.5 * 3600 * 1000).getUTCHours();
      expect(localHour).toBeGreaterThanOrEqual(7);
      expect(localHour).toBeLessThanOrEqual(21);
    }
  });

  it('uses sensible amounts', () => {
    for (const p of make()) {
      expect(p.amount).toBeGreaterThanOrEqual(100);
      expect(p.amount).toBeLessThanOrEqual(5000);
      expect(p.amount % 10).toBe(0);
    }
  });
});
