import { describe, expect, it } from 'vitest';

import { phaseNow } from './festiveClock';

describe('phaseNow', () => {
  it('is how far into the loop the clock stands, as a negative delay', () => {
    expect(phaseNow(80, 80_000 * 3 + 12_345)).toBe('-12.345s');
    expect(phaseNow(80, 80_000 * 3)).toBe('-0.000s');
  });

  /** Two surfaces reading the clock a moment apart land a moment apart in the loop —
   *  the mount time drops out, which is what keeps three copies of a walker in step. */
  it('gives two surfaces that mount at different times the same point in the loop', () => {
    const a = phaseNow(80, 1_000_000);
    const b = phaseNow(80, 1_000_000 + 80_000);
    expect(a).toBe(b);
  });

  /** A shifted copy stands that much further into the loop — and wraps, so a copy run
   *  behind the clock near the loop's start lands near its end rather than at a
   *  positive delay that would hold the animation still. */
  it('shifts a copy ahead of or behind the clock, wrapping round the loop', () => {
    expect(phaseNow(46, 10_000, 1.38)).toBe('-11.380s');
    expect(phaseNow(46, 10_000, -8.74)).toBe('-1.260s');
    expect(phaseNow(46, 10_000, -12)).toBe('-44.000s');
  });
});
