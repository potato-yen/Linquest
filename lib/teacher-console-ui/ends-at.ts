export const MIN_OFFSET_MIN = 5;

export function endsAtFromDuration(
  d: { days: number; hours: number },
  now: Date = new Date(),
): string {
  const ms = now.getTime() + (d.days * 24 + d.hours) * 3600_000;
  if (ms <= now.getTime() + MIN_OFFSET_MIN * 60_000) {
    throw new Error('INVALID_ENDS_AT');
  }
  return new Date(ms).toISOString();
}
