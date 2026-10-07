// Sri Lanka time helpers. Sri Lanka is UTC+5:30 all year (no daylight saving).

export const SL_TIME_ZONE = 'Asia/Colombo';
export const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Midnight (Sri Lanka time) at the start of the day that contains `date`. */
export function slDayStart(date: Date): Date {
  const local = date.getTime() + SL_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - SL_OFFSET_MS);
}

/** Hour of the day (0-23) in Sri Lanka. */
export function slHour(date: Date): number {
  return new Date(date.getTime() + SL_OFFSET_MS).getUTCHours();
}
