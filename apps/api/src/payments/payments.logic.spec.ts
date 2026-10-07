import { buildSummary } from './payments.logic';

describe('buildSummary', () => {
  it('fills all 24 hours and adds up today', () => {
    const s = buildSummary(
      [
        { hour: 9, count: 3, total: 1500 },
        { hour: 10, count: 2, total: 800 },
      ],
      [{ hour: 9, count: 35, total: 0 }],
      7,
    );
    expect(s.hourly).toHaveLength(24);
    expect(s.today).toEqual({ count: 5, total: 2300 });
    expect(s.hourly[9]).toEqual({ hour: 9, count: 3, typical: 5 });
    expect(s.hourly[10]).toEqual({ hour: 10, count: 2, typical: 0 });
    expect(s.hourly[3]).toEqual({ hour: 3, count: 0, typical: 0 });
  });

  it('rounds the typical value to 1 decimal', () => {
    const s = buildSummary([], [{ hour: 12, count: 10, total: 0 }], 7);
    expect(s.hourly[12].typical).toBe(1.4);
  });
});
