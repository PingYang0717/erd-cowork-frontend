import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhTW from 'antd/locale/zh_TW';
import React, { type CSSProperties, type ReactNode, useEffect, useMemo } from 'react';

import { useLanguageStore } from '@/stores/useLanguageStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { buildAntdTheme } from '@/theme/antdTheme';
import { THEME_TOKENS, themeCssText, type ThemeTokens } from '@/theme/tokens';

// One retry, not the default three: with suspense queries a failure only reaches the
// ErrorBoundary after the retries burn down, and three exponential backoffs meant the
// "無法連線到後端服務" screen took 7-15s to appear. One retry still absorbs a blip.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

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
  // antd carries its own strings — the Select's empty state, Modal's OK/Cancel, the
  // DatePicker's month names. Left on the default they would stay in one language while
  // everything around them switched, which reads as a half-finished translation rather
  // than as a choice.
  const language = useLanguageStore((s) => s.language);
  const tokens = THEME_TOKENS[isDarkMode ? 'dark' : 'light'];
  // Built once per theme, not once per render. antd caches its derived tokens and the
  // CSS it generates against this object's identity, so handing it a fresh one — which
  // `buildAntdTheme(isDarkMode)` inline did — throws that cache away for a value that
  // only changes when the theme does.
  const antdTheme = useMemo(() => buildAntdTheme(isDarkMode), [isDarkMode]);

  // Syncing an external system — the document element React does not own — is the
  // one thing useEffect is for. index.html hard-codes zh-Hant; without this a
  // screen reader keeps announcing English copy with a Chinese voice after the
  // toggle, and the browser's translate/line-breaking rules stay wrong with it.
  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-Hant';
  }, [language]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={language === 'en' ? enUS : zhTW} theme={antdTheme}>
        <AntdApp>
          <ThemedSurface tokens={tokens}>{children}</ThemedSurface>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
