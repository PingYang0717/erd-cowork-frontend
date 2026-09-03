// The mockup's own palette, copied verbatim from the `:root` and
// `:root[data-theme="dark"]` blocks of `eRDWorkspace20260819.html`.
//
// ADR-0002 requires the app's colors to match the mockup rather than merely
// resemble it, and antd's algorithms do not land on the same values: its dark
// algorithm paints layout/container/elevated surfaces `#000000` / `#141414` /
// `#1f1f1f` where the mockup uses `#17181c` / `#1f1f22` / `#262629`, and its
// light layout background is `#f5f5f5` against the mockup's `#f5f6f8`.
//
// One table feeds both consumers: the antd `ConfigProvider` tokens (for what
// antd paints itself) and the `--erd-color-*` custom properties the CSS
// Modules read. Anything the CSS or an inline style references must exist
// here, or it silently keeps its light-mode literal fallback in dark mode.
export interface ThemeTokens {
  primary: string;
  primaryHover: string;
  primaryBg: string;
  primaryBorder: string;
  link: string;
  success: string;
  successBg: string;
  successBorder: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  error: string;
  errorBg: string;
  errorBorder: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  bgLayout: string;
  bgContainer: string;
  bgElevated: string;
  border: string;
  borderSecondary: string;
  fillTertiary: string;
  fillQuaternary: string;
  /** The chat surfaces, aligned to cowork's Tailwind gray ladder (ADR-0002): the AI
   *  bubble, the code/pre fill one step deeper, the table stripe/header tint, and the
   *  hairline border tables and chips draw on a white card. cowork has no dark theme,
   *  so the dark values are ours, chosen to sit on the same rungs of the existing
   *  dark ladder (container #1f1f22 → bubble ≈ elevated → code one step lighter). */
  chatBubbleBg: string;
  chatCodeBg: string;
  chatStripeBg: string;
  chatBorder: string;
  /** cowork mockup's scrollbar thumb (14% black); dark value is ours. */
  scrollbarThumb: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

export const THEME_TOKENS: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    primary: '#1677ff',
    primaryHover: '#4096ff',
    primaryBg: '#e6f4ff',
    primaryBorder: '#91caff',
    link: '#1677ff',
    success: '#52c41a',
    successBg: '#f6ffed',
    successBorder: '#b7eb8f',
    warning: '#faad14',
    warningBg: '#fffbe6',
    warningBorder: '#ffe58f',
    error: '#ff4d4f',
    errorBg: '#fff2f0',
    errorBorder: '#ffccc7',
    text: 'rgba(0, 0, 0, 0.88)',
    textSecondary: 'rgba(0, 0, 0, 0.65)',
    textTertiary: 'rgba(0, 0, 0, 0.45)',
    textQuaternary: 'rgba(0, 0, 0, 0.25)',
    bgLayout: '#f5f6f8',
    bgContainer: '#ffffff',
    bgElevated: '#ffffff',
    border: '#d9d9d9',
    borderSecondary: '#f0f0f0',
    fillTertiary: 'rgba(0, 0, 0, 0.04)',
    fillQuaternary: 'rgba(0, 0, 0, 0.02)',
    chatBubbleBg: '#f3f4f6',
    chatCodeBg: '#e5e7eb',
    chatStripeBg: '#f9fafb',
    chatBorder: '#e5e7eb',
    scrollbarThumb: 'rgba(0, 0, 0, 0.14)',
    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 6px -1px rgba(0, 0, 0, 0.03)',
    shadowMd: '0 6px 16px rgba(0, 0, 0, 0.08)',
    // The mockup never declares --shadow-lg; its dialogs and flyouts use this
    // literal as the var fallback, in both themes.
    shadowLg: '0 12px 40px rgba(0, 0, 0, 0.28)',
  },
  dark: {
    primary: '#1668dc',
    primaryHover: '#3c89e8',
    primaryBg: '#111a2c',
    primaryBorder: '#15325b',
    link: '#4cc2ff',
    success: '#49aa19',
    successBg: '#162312',
    successBorder: '#274916',
    warning: '#d89614',
    warningBg: '#2b2111',
    warningBorder: '#594214',
    error: '#dc4446',
    errorBg: '#2c1618',
    errorBorder: '#5b2526',
    text: 'rgba(255, 255, 255, 0.88)',
    textSecondary: 'rgba(255, 255, 255, 0.65)',
    textTertiary: 'rgba(255, 255, 255, 0.45)',
    textQuaternary: 'rgba(255, 255, 255, 0.25)',
    bgLayout: '#17181c',
    bgContainer: '#1f1f22',
    bgElevated: '#262629',
    border: '#424242',
    borderSecondary: '#303030',
    fillTertiary: 'rgba(255, 255, 255, 0.06)',
    fillQuaternary: 'rgba(255, 255, 255, 0.03)',
    chatBubbleBg: '#262629',
    chatCodeBg: '#303034',
    chatStripeBg: 'rgba(255, 255, 255, 0.04)',
    chatBorder: '#303030',
    scrollbarThumb: 'rgba(255, 255, 255, 0.2)',
    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    shadowMd: '0 6px 16px rgba(0, 0, 0, 0.45)',
    shadowLg: '0 12px 40px rgba(0, 0, 0, 0.28)',
  },
};

// The custom-property surface the CSS Modules read. Keys mirror the mockup's
// own variable names one-for-one.
export const themeCssVars = (tokens: ThemeTokens): Record<string, string> => {
  return {
    '--erd-color-primary': tokens.primary,
    '--erd-color-primary-hover': tokens.primaryHover,
    '--erd-color-primary-bg': tokens.primaryBg,
    '--erd-color-primary-border': tokens.primaryBorder,
    '--erd-color-link': tokens.link,
    '--erd-color-success': tokens.success,
    '--erd-color-success-bg': tokens.successBg,
    '--erd-color-success-border': tokens.successBorder,
    '--erd-color-warning': tokens.warning,
    '--erd-color-warning-bg': tokens.warningBg,
    '--erd-color-warning-border': tokens.warningBorder,
    '--erd-color-error': tokens.error,
    '--erd-color-error-bg': tokens.errorBg,
    '--erd-color-error-border': tokens.errorBorder,
    '--erd-color-text': tokens.text,
    '--erd-color-text-secondary': tokens.textSecondary,
    '--erd-color-text-tertiary': tokens.textTertiary,
    '--erd-color-text-quaternary': tokens.textQuaternary,
    '--erd-color-bg-layout': tokens.bgLayout,
    '--erd-color-bg-container': tokens.bgContainer,
    '--erd-color-bg-elevated': tokens.bgElevated,
    '--erd-color-border': tokens.border,
    '--erd-color-border-secondary': tokens.borderSecondary,
    '--erd-color-fill-tertiary': tokens.fillTertiary,
    '--erd-color-fill-quaternary': tokens.fillQuaternary,
    // Not mockup names: the chat-* group and the scrollbar thumb come from the
    // cowork alignment (ADR-0002).
    '--erd-color-chat-bubble-bg': tokens.chatBubbleBg,
    '--erd-color-chat-code-bg': tokens.chatCodeBg,
    '--erd-color-chat-stripe-bg': tokens.chatStripeBg,
    '--erd-color-chat-border': tokens.chatBorder,
    '--erd-scrollbar-thumb': tokens.scrollbarThumb,
    '--shadow-sm': tokens.shadowSm,
    '--shadow-md': tokens.shadowMd,
    '--shadow-lg': tokens.shadowLg,
  };
};

// The same palette as a :root rule. Dialogs, dropdown menus and the collapsed
// rail flyout are portaled to document.body, outside the React tree that could
// carry these as inline styles — declaring them on :root is what lets those
// surfaces read the theme instead of silently falling back to the light
// literals baked into each var() call.
export const themeCssText = (tokens: ThemeTokens): string => {
  const declarations = Object.entries(themeCssVars(tokens))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `:root {
${declarations}
}`;
};
