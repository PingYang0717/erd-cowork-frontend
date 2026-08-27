// Self-hosted (@fontsource) like cowork upstream: the internal network blocks font
// CDNs, so the files ship in the bundle (ADR-0010).
import '@fontsource-variable/inter/wght.css';
import '@fontsource/noto-sans-tc/400.css';
import '@fontsource/noto-sans-tc/500.css';
import '@fontsource/noto-sans-tc/700.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
