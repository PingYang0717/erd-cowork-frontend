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
});
