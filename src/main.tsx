import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { isLive } from '@/services/transport';

async function enableMocking() {
  if (!import.meta.env.DEV) return;
  // Live mode still needs MSW for the endpoints no backend implements (the gallery
  // listing, sharing, the directory, Schedule, Connectors, DC items, artifact
  // versions); it only stops intercepting the ones a backend does serve.
  const { worker } = await import('@/mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

if (isLive) {
  console.info('[eRD Cowork] live transport: sessions / messages / artifact HTML / uploads');
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
