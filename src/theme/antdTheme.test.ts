import { theme } from 'antd';
import { describe, expect, it } from 'vitest';

import { buildAntdTheme, FONT_FAMILY } from './antdTheme';
import { THEME_TOKENS } from './tokens';

/** What antd actually ends up using, after its algorithm has run over the seeds and the
 *  overrides have been applied on top. */
const resolve = (isDarkMode: boolean) => {
  return theme.getDesignToken(buildAntdTheme(isDarkMode));
};

describe('buildAntdTheme', () => {
  /** The one that has already broken once. A seed is a starting hue, not a colour to
   *  display — `darkAlgorithm` derives the dark ladder from it. The mockup's dark palette
   *  IS what antd derives from the light seeds, so handing it an already-dark value
   *  darkens it twice: `#1668dc` comes back `#165bbe`. Anyone "fixing" the seeds to use
   *  the dark table breaks this. */
  it('derives the mockup dark palette by keeping the seeds light', () => {
    const dark = resolve(true);

    expect(dark.colorPrimary).toBe(THEME_TOKENS.dark.primary);
    expect(dark.colorSuccess).toBe(THEME_TOKENS.dark.success);
  });

  it('feeding the dark table as the seed would darken it twice — what this guards against', () => {
    const doubleDarkened = theme.getDesignToken({
      algorithm: theme.darkAlgorithm,
      token: { colorPrimary: THEME_TOKENS.dark.primary, colorSuccess: THEME_TOKENS.dark.success },
    });

    expect(doubleDarkened.colorPrimary).not.toBe(THEME_TOKENS.dark.primary);
    expect(doubleDarkened.colorSuccess).not.toBe(THEME_TOKENS.dark.success);
  });

  it('keeps light mode on the light table', () => {
    const light = resolve(false);

    expect(light.colorPrimary).toBe(THEME_TOKENS.light.primary);
    expect(light.colorSuccess).toBe(THEME_TOKENS.light.success);
  });

  /** Map and alias tokens are applied after derivation, so unlike the seeds they follow
   *  the active theme directly. Surfaces are where a light value leaking into dark mode
   *  would be most visible. */
  it('pins the surfaces to the active theme', () => {
    const dark = resolve(true);
    const light = resolve(false);

    expect(dark.colorBgLayout).toBe(THEME_TOKENS.dark.bgLayout);
    expect(dark.colorBgContainer).toBe(THEME_TOKENS.dark.bgContainer);
    expect(dark.colorBgElevated).toBe(THEME_TOKENS.dark.bgElevated);
    expect(light.colorBgLayout).toBe(THEME_TOKENS.light.bgLayout);
    expect(light.colorBgContainer).toBe(THEME_TOKENS.light.bgContainer);
  });

  it('uses the shared font stack rather than a re-typed copy', () => {
    expect(resolve(false).fontFamily).toBe(FONT_FAMILY);
    expect(FONT_FAMILY).toContain('Inter Variable');
    expect(FONT_FAMILY).toContain('Noto Sans TC');
  });
});
