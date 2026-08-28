import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import React, { type CSSProperties, type ReactNode } from 'react';

import { useThemeStore } from '@/stores/useThemeStore';
import { buildAntdTheme } from '@/theme/antdTheme';
import { THEME_TOKENS, themeCssText, type ThemeTokens } from '@/theme/tokens';

const queryClient = new QueryClient();

// ConfigProvider's theme algorithm only affects antd components themselves;
// plain HTML (body, <h1>, etc.) has no background/text color of its own, so
// in dark mode its text (colored for a dark surface by antd's global CSS
// reset) would render on the browser's default white canvas and vanish.
// This surface paints the whole page and exposes the mockup's palette as
// `--erd-color-*` custom properties, which the CSS Modules across the app
// read instead of hardcoding colors.
interface ThemedSurfaceProps {
  tokens: ThemeTokens;
  children: ReactNode;
}

const ThemedSurface: React.FC<ThemedSurfaceProps> = ({ tokens, children }) => {
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
};

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const tokens = THEME_TOKENS[isDarkMode ? 'dark' : 'light'];

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={buildAntdTheme(isDarkMode)}>
        <AntdApp>
          <ThemedSurface tokens={tokens}>{children}</ThemedSurface>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
