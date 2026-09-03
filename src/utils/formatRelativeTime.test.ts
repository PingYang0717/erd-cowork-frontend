import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from './formatRelativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('renders the recent tiers', () => {
    expect(formatRelativeTime('2026-09-03T11:59:40.000Z', now)).toBe('Just now');
    expect(formatRelativeTime('2026-09-03T11:30:00.000Z', now)).toBe('30m ago');
  });

  it('carries the year across a year boundary', () => {
    // Last September and this September must not read identically in the rail.
    expect(formatRelativeTime('2025-09-02T12:00:00.000Z', now)).toBe('Sep 2, 2025');
  });

  it('renders nothing — not NaN prose — for a timestamp that does not parse', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
