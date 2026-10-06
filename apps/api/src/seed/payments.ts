// Makes realistic fake payment history for the seed script.

/** Small seeded random generator, so the demo data is the same every time. */
export function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sri Lanka is UTC+5:30 all year (no daylight saving).
const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// How busy a typical shop is at each local hour (0 = closed).
// Busy at lunch time and in the evening.
const HOUR_WEIGHT = [
  0, 0, 0, 0, 0, 0, 0, 0.3, 0.6, 0.8, 0.9, 1, 1.4, 1.3, 0.9, 0.8, 0.9, 1.2, 1.5, 1.3, 0.8, 0.4, 0,
  0,
];

export interface FakePayment {
  amount: number;
  customerRef: string;
  status: 'success' | 'failed';
  createdAt: Date;
}

/**
 * Payments for one shop over the last `days` days, up to `now`.
 * `perHour` is the average number of payments in a normal busy hour.
 */
export function fakePayments(opts: {
  days: number;
  perHour: number;
  now: Date;
  random: () => number;
}): FakePayment[] {
  const { days, perHour, now, random } = opts;
  const out: FakePayment[] = [];
  // Start at the beginning of a Sri Lanka hour, `days` days ago.
  // (UTC hours and Sri Lanka hours are 30 minutes apart.)
  const from = now.getTime() - days * 24 * HOUR_MS + SL_OFFSET_MS;
  const start = Math.floor(from / HOUR_MS) * HOUR_MS - SL_OFFSET_MS;

  for (let hourStart = start; hourStart < now.getTime(); hourStart += HOUR_MS) {
    const local = new Date(hourStart + SL_OFFSET_MS);
    const weekend = local.getUTCDay() === 0 || local.getUTCDay() === 6;
    const expected = perHour * HOUR_WEIGHT[local.getUTCHours()] * (weekend ? 1.2 : 1);
    // Random count around the expected value (+/- 50%).
    const count = Math.round(expected * (0.5 + random()));

    for (let i = 0; i < count; i++) {
      const createdAt = new Date(hourStart + Math.floor(random() * HOUR_MS));
      if (createdAt > now) continue;
      out.push({
        // LKR 100 to about 5,000, rounded to 10. Most payments are small.
        amount: Math.round((100 + random() ** 2 * 4900) / 10) * 10,
        customerRef:
          'CUST-' +
          Math.floor(random() * 10000)
            .toString()
            .padStart(4, '0'),
        status: random() < 0.02 ? 'failed' : 'success',
        createdAt,
      });
    }
  }
  return out.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
