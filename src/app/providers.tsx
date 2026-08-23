import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

import { useThemeStore } from '@/features/theme/store/useThemeStore';

const queryClient = new QueryClient();

// Matches eRDWorkspace20260819.html's `body { font-family: ... }` exactly —
// antd's own default token stack swaps in 'Noto Sans' + emoji fonts instead
// of PingFang TC / Microsoft JhengHei, which is close but not the mockup.
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang TC", "Microsoft JhengHei", sans-serif';

// ConfigProvider's theme algorithm only affects antd components themselves;
// plain HTML (body, <h1>, etc.) has no background/text color of its own, so
// in dark mode its text (colored for a dark surface by antd's global CSS
// reset) would render on the browser's default white canvas and vanish.
// This surface reads the resolved tokens and paints the whole page, and also
// exposes them as `--erd-color-*` custom properties: CSS Modules across the
// app read these (with light-mode fallbacks) instead of hardcoding colors,
// so a plain element like a <button> stays legible when the theme flips
// instead of keeping the browser's default (always-black) foreground.
function ThemedSurface({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  const themeVars = {
    height: '100vh',
    background: token.colorBgLayout,
    color: token.colorText,
    '--erd-color-text': token.colorText,
    '--erd-color-text-secondary': token.colorTextSecondary,
    '--erd-color-text-tertiary': token.colorTextTertiary,
    '--erd-color-primary': token.colorPrimary,
    '--erd-color-success': token.colorSuccess,
    '--erd-color-success-bg': token.colorSuccessBg,
    '--erd-color-success-border': token.colorSuccessBorder,
    '--erd-color-border': token.colorBorder,
    '--erd-color-border-secondary': token.colorBorderSecondary,
    '--erd-color-fill-tertiary': token.colorFillTertiary,
    '--erd-color-fill-quaternary': token.colorFillQuaternary,
    '--erd-color-bg-container': token.colorBgContainer,
    '--erd-color-bg-elevated': token.colorBgElevated,
  } as CSSProperties;

  return <div style={themeVars}>{children}</div>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            fontFamily: FONT_FAMILY,
            // The mockup's body text runs 12-13.5px throughout; antd's
            // default (14) reads noticeably larger/heavier across every
            // control that doesn't have its own font-size override.
            fontSize: 13,
          },
          components: {
            // Mockup's modal dialog corners (oh()) are 16px; antd's default
            // borderRadiusLG (8px) is otherwise fine for Dropdown/Select/etc,
            // so this is scoped to Modal only rather than changed globally.
            Modal: { borderRadiusLG: 16 },
            // Mockup's composer "+" menu panel uses border-radius:11px.
            Dropdown: { borderRadiusLG: 11 },
          },
        }}
      >
        <AntdApp>
          <ThemedSurface>{children}</ThemedSurface>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
