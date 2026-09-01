import { describe, expect, it } from 'vitest';

import { THEME_TOKENS } from './tokens';

describe('theme tokens', () => {
  /** Every colour has to exist in both themes. A token defined only in light reaches dark
   *  as `undefined`, which renders as the CSS fallback — a light-theme colour on a dark
   *  surface, and nothing in the type system says so, because both halves are typed by
   *  the same interface only if both are written out. */
  it('defines the same colours in light and dark', () => {
    expect(Object.keys(THEME_TOKENS.dark).sort()).toEqual(Object.keys(THEME_TOKENS.light).sort());
  });
});
