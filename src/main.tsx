// Self-hosted (@fontsource) like cowork upstream: the internal network blocks font
// CDNs, so the files ship in the bundle (ADR-0002).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/App';
import { initInternalRuntime } from '@/bootstrap/internal';

import '@fontsource-variable/inter/wght.css';
// Variable font: one face covers 100-900, replacing the 400/500/700 static trio — the
// @font-face CSS was 88.7% of the render-blocking stylesheet, and this cuts those
// declarations to a third. Weight rendering needs a visual once-over after any swap.
import '@fontsource-variable/noto-sans-tc/wght.css';
import './index.css';

const mountApp = (): void => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

// Internal-environment initialisation MUST finish before mount (SSO decides X-User-Id);
// the default environment is a no-op that resolves immediately. Deliberately not caught:
// if initialisation fails, the rejection surfaces in the console and the app does NOT
// mount. It must NEVER carry on under an anonymous identity.
void initInternalRuntime().then(mountApp);
