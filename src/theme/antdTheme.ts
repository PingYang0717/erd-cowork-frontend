import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

import { THEME_TOKENS } from './tokens';

/** The hues antd's algorithm derives a whole palette from.
 *
 *  **These stay on the light values in both themes**, and that is not an oversight.
 *  A seed is a starting hue, not a colour to display: `darkAlgorithm`'s job is to derive
 *  the dark ladder from it, and the mockup's dark palette IS what antd derives from these
 *  light seeds (`#1677ff` → `#1668dc`, `#52c41a` → `#49aa19`). Hand it a value that has
 *  already been darkened and it darkens it twice — `#1668dc` comes back as `#165bbe`,
 *  which is exactly the wrong primary button this once shipped.
 *
 *  `antdTheme.test.ts` pins this down against the table's dark values. */
const SEED = THEME_TOKENS.light;

/** cowork upstream's stack (its `theme/fonts.ts`, ADR-0002): self-hosted Inter Variable +
 *  Noto Sans TC, imported in `main.tsx`, with the platform CJK faces as fallback.
 *
 *  Three places render text with it and MUST agree: the `body` rule in `index.css`, this
 *  token, and anything reading `--erd-color-*` alongside it. This constant is the one
 *  they all point at — NEVER re-type the stack. */
export const FONT_FAMILY =
  "'Inter Variable', 'Noto Sans TC Variable', -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif";

/** Overlays open instantly. antd animates them on the three duration tokens (0.1/0.2/0.3s
 *  by default); on a dialog or a menu that reads as lag, not as motion — the user is
 *  already looking at where the panel will appear. Applied per component rather than via
 *  the global `motion: false` seed, which would also flatten button waves, collapse and
 *  toasts — those animate things the eye is not yet fixed on, and there the motion helps.
 *
 *  Not `0s`: a zero-duration CSS transition fires no `transitionend`, and rc-motion (what
 *  antd removes an overlay with) waits for that event before unmounting. A Modal closed
 *  under `0s` faded its mask to nothing and then left it in the DOM — invisible, still
 *  swallowing clicks and holding the focus lock, so the page looked fine but would not
 *  take a keystroke. 10ms is imperceptible and still fires the event. */
const INSTANT = {
  motionDurationFast: '0.01s',
  motionDurationMid: '0.01s',
  motionDurationSlow: '0.01s',
} as const;

/** Maps the product's palette onto antd's token names.
 *
 *  The colours themselves live in `tokens.ts`, which also feeds the `--erd-color-*` CSS
 *  custom properties — so antd's components and the plain elements around them cannot
 *  drift apart in either theme. This module is only the adapter between the two.
 *
 *  Two kinds of token go in, and the difference matters:
 *  - **seed** (`colorPrimary` / `colorSuccess` / `colorWarning` / `colorError`) — the
 *    algorithm derives from these, so they stay light in both themes (see `SEED`).
 *  - **map / alias** (surfaces, borders, fills, text, `colorPrimaryBg`…) — applied after
 *    derivation, so they are pinned to the active theme directly. */
export function buildAntdTheme(isDarkMode: boolean): ThemeConfig {
  const tokens = THEME_TOKENS[isDarkMode ? 'dark' : 'light'];

  return {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      fontFamily: FONT_FAMILY,
      // The mockup's body text runs 12-13.5px throughout; antd's default (14) reads
      // noticeably larger/heavier across every control without its own font-size.
      fontSize: 13,

      colorPrimary: SEED.primary,
      colorSuccess: SEED.success,
      colorWarning: SEED.warning,
      colorError: SEED.error,

      colorPrimaryHover: tokens.primaryHover,
      colorPrimaryBg: tokens.primaryBg,
      colorPrimaryBorder: tokens.primaryBorder,
      colorLink: tokens.link,
      colorSuccessBg: tokens.successBg,
      colorSuccessBorder: tokens.successBorder,
      colorWarningBg: tokens.warningBg,
      colorWarningBorder: tokens.warningBorder,
      colorErrorBg: tokens.errorBg,
      colorErrorBorder: tokens.errorBorder,
      colorText: tokens.text,
      colorTextSecondary: tokens.textSecondary,
      colorTextTertiary: tokens.textTertiary,
      colorTextQuaternary: tokens.textQuaternary,
      colorBgLayout: tokens.bgLayout,
      colorBgContainer: tokens.bgContainer,
      colorBgElevated: tokens.bgElevated,
      colorBorder: tokens.border,
      colorBorderSecondary: tokens.borderSecondary,
      colorFillTertiary: tokens.fillTertiary,
      colorFillQuaternary: tokens.fillQuaternary,
      boxShadow: tokens.shadowMd,
      boxShadowSecondary: tokens.shadowMd,
    },
    components: {
      // Mockup's modal dialog corners (oh()) are 16px; antd's default borderRadiusLG
      // (8px) is otherwise fine for Dropdown/Select/etc, so this is scoped to Modal
      // rather than changed globally. The mockup's dialog: an elevated card with a
      // hairline border and a bg-container footer band.
      Modal: {
        ...INSTANT,
        borderRadiusLG: 16,
        contentBg: tokens.bgElevated,
        headerBg: tokens.bgElevated,
        footerBg: tokens.bgContainer,
        titleFontSize: 16,
      },
      // Mockup's composer "+" menu panel uses border-radius:11px.
      Dropdown: { ...INSTANT, borderRadiusLG: 11 },
      Select: INSTANT,
    },
  };
}
