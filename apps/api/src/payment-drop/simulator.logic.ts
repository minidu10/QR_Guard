// Helpers for the live payment simulator (demo only). Pure, so they are easy to test.

/**
 * How many payments to make this minute, so that over an hour the shop gets close to
 * its normal number. The leftover fraction is carried to the next minute.
 * (Steady on purpose: real randomness would trigger false "payment drop" alerts.)
 */
export function steadyCount(
  carry: number,
  perMinute: number,
  random: () => number = Math.random,
): { count: number; carry: number } {
  const total = carry + perMinute * (0.5 + random());
  const count = Math.floor(total);
  return { count, carry: total - count };
}

/** Fake amount: LKR 100 to about 5,000, rounded to 10. Most payments are small. */
export function fakeAmount(random: () => number = Math.random): number {
  return Math.round((100 + random() ** 2 * 4900) / 10) * 10;
}
