// Self-hosted (@fontsource) like cowork upstream: the internal network blocks font
// CDNs, so the files ship in the bundle (ADR-0002).
import '@fontsource-variable/inter/wght.css';
// Variable font: one face covers 100-900, replacing the 400/500/700 static trio — the
// @font-face CSS was 88.7% of the render-blocking stylesheet, and this cuts those
// declarations to a third. Weight rendering needs a visual once-over after any swap.
import '@fontsource-variable/noto-sans-tc/wght.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/App';
import { initInternalRuntime } from '@/bootstrap/internal';

const mountApp = (): void => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// internal 環境的初始化 MUST 在 mount 前完成(SSO 決定 X-User-Id);預設環境是 no-op 立即 resolve。
// 刻意不 catch:初始化失敗時讓 rejection 浮上 console 且不 mount,NEVER 以匿名身分繼續。
void initInternalRuntime().then(mountApp);
