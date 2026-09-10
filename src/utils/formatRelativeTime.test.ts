import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from './formatRelativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('renders the recent tiers', () => {
    expect(formatRelativeTime('2026-09-03T11:59:40.000Z', now)).toBe('Just now');
    expect(formatRelativeTime('2026-09-03T11:30:00.000Z', now)).toBe('30m ago');
  });

  /** A weekday on its own is not a date. "Thu" tells a reader which day of the week it
   *  was and nothing about which week — on a shelf of Artifacts going back months, that is
   *  the one thing they cannot work out for themselves. Past yesterday it says the date. */
  it('names the date rather than the weekday once yesterday is past', () => {
    expect(formatRelativeTime('2026-09-02T12:00:00.000Z', now)).toBe('Yesterday');
    expect(formatRelativeTime('2026-08-31T12:00:00.000Z', now)).toBe('Aug 31');
    expect(formatRelativeTime('2026-08-29T12:00:00.000Z', now)).toBe('Aug 29');
  });

  it('carries the year across a year boundary', () => {
    // Last September and this September must not read identically in the rail.
    expect(formatRelativeTime('2025-09-02T12:00:00.000Z', now)).toBe('Sep 2, 2025');
  });

  it('renders nothing — not NaN prose — for a timestamp that does not parse', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
