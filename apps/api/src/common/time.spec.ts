import { slDayStart, slHour } from './time';

describe('Sri Lanka time helpers', () => {
  it('finds local midnight', () => {
    // 2026-03-15 02:00 in Sri Lanka = 2026-03-14 20:30 UTC.
    const at = new Date('2026-03-14T20:30:00Z');
    expect(slDayStart(at).toISOString()).toBe('2026-03-14T18:30:00.000Z');
  });

  it('gives the local hour', () => {
    expect(slHour(new Date('2026-03-15T06:45:00Z'))).toBe(12); // 12:15 local
    expect(slHour(new Date('2026-03-14T18:30:00Z'))).toBe(0); // local midnight
  });
});
