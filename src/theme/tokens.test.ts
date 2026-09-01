import { describe, expect, it } from 'vitest';

import { THEME_TOKENS, themeCssVars } from './tokens';

describe('theme tokens', () => {
  /** Every colour has to exist in both themes. A token defined only in light reaches dark
   *  as `undefined`, which renders as the CSS fallback — a light-theme colour on a dark
   *  surface, and nothing in the type system says so, because both halves are typed by
   *  the same interface only if both are written out. */
  it('defines the same colours in light and dark', () => {
    expect(Object.keys(THEME_TOKENS.dark).sort()).toEqual(Object.keys(THEME_TOKENS.light).sort());
  });

  /** The accent is the dialog's second action colour (copying the share link). It exists
   *  so a surface does not offer two primary-blue buttons and leave the reader working out
   *  which one finishes the job. */
  it('publishes the accent colours as CSS variables in both themes', () => {
    for (const tokens of [THEME_TOKENS.light, THEME_TOKENS.dark]) {
      const vars = themeCssVars(tokens);
      expect(vars['--erd-color-accent']).toBe(tokens.accent);
      expect(vars['--erd-color-accent-hover']).toBe(tokens.accentHover);
      expect(tokens.accent).not.toBe(tokens.primary);
    }
  });
});
