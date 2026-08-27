import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

import { useThemeStore } from '@/stores/useThemeStore';
import { THEME_TOKENS, themeCssText, type ThemeTokens } from '@/theme/tokens';

const queryClient = new QueryClient();

// The hues antd's algorithm derives a whole palette from; see the note in
// AppProviders for why these stay on the light values in both themes.
const SEED = THEME_TOKENS.light;

// cowork upstream's stack (its theme/fonts.ts, ADR-0010): self-hosted Inter Variable +
// Noto Sans TC, imported in main.tsx, with the platform CJK faces as fallback. Must
// stay in step with the body rule in index.css.
const FONT_FAMILY =
  "'Inter Variable', 'Noto Sans TC', -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif";

// ConfigProvider's theme algorithm only affects antd components themselves;
// plain HTML (body, <h1>, etc.) has no background/text color of its own, so
// in dark mode its text (colored for a dark surface by antd's global CSS
// reset) would render on the browser's default white canvas and vanish.
// This surface paints the whole page and exposes the mockup's palette as
// `--erd-color-*` custom properties, which the CSS Modules across the app
// read instead of hardcoding colors.
function ThemedSurface({ tokens, children }: { tokens: ThemeTokens; children: ReactNode }) {
  const surface: CSSProperties = {
    height: '100vh',
    background: tokens.bgLayout,
    color: tokens.text,
  };

  return (
    <>
      <style>{themeCssText(tokens)}</style>
      <div style={surface}>{children}</div>
    </>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const tokens = THEME_TOKENS[isDarkMode ? 'dark' : 'light'];

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            fontFamily: FONT_FAMILY,
            // antd's 0.3s default makes every dialog read as lag rather than motion;
            // modal/mask enter-leave animate on this token.
            motionDurationSlow: '0.15s',
            // The mockup's body text runs 12-13.5px throughout; antd's
            // default (14) reads noticeably larger/heavier across every
            // control that doesn't have its own font-size override.
            fontSize: 13,
            // The algorithm gets the palette shape right but not the mockup's
            // exact surfaces, so everything below comes from the one table in
            // `theme/tokens.ts` that also feeds the CSS custom
            // properties — antd components and plain elements cannot drift
            // apart in either theme.
            // Seed hues stay light in both themes: the mockup's dark palette
            // IS antd's dark palette for these seeds (#1677ff derives #1668dc,
            // #52c41a derives #49aa19, and so on), so handing the algorithm a
            // value it has already darkened darkens it twice — that is what
            // rendered the primary button #165bbe instead of #1668dc.
            colorPrimary: SEED.primary,
            colorSuccess: SEED.success,
            colorWarning: SEED.warning,
            colorError: SEED.error,
            // The rest are map/alias tokens, applied as overrides after
            // derivation, so they are pinned to the active theme directly.
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
            // Mockup's modal dialog corners (oh()) are 16px; antd's default
            // borderRadiusLG (8px) is otherwise fine for Dropdown/Select/etc,
            // so this is scoped to Modal only rather than changed globally.
            // The mockup's dialog: an elevated card with a hairline border
            // and a bg-container footer band.
            Modal: {
              borderRadiusLG: 16,
              contentBg: tokens.bgElevated,
              headerBg: tokens.bgElevated,
              footerBg: tokens.bgContainer,
              titleFontSize: 16,
            },
            // Mockup's composer "+" menu panel uses border-radius:11px.
            Dropdown: { borderRadiusLG: 11 },
          },
        }}
      >
        <AntdApp>
          <ThemedSurface tokens={tokens}>{children}</ThemedSurface>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
