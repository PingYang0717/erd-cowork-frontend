// Seeds the anonymous user id BEFORE the mocks' module graph loads — fixtures capture
// `currentUser.id` at module-load time. Side-effect import; must stay first.
import './seedTestIdentity';
import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { setStreamPace } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { useLanguageStore } from '@/stores/useLanguageStore';

import { installFormDataWire } from './formDataWire';
import { TEST_USER_ID } from './seedTestIdentity';

// jsdom doesn't implement ResizeObserver; antd components (e.g. Dropdown)
// use it internally via rc-resize-observer.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub;

// jsdom doesn't implement matchMedia; antd's Table registers a responsive
// observer through it (grid useBreakpoint).
window.matchMedia ??= (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// Every pane now suspends before it renders (useSuspenseQuery), so a findBy* waits on
// one more async hop than it used to. The 1s default is enough on an idle machine and
// not enough under a parallel run — which is a scheduling artefact, not a real failure.
configure({ asyncUtilTimeout: 5000 });

// FormData → browser-equivalent multipart bytes, so filenames survive the jsdom → MSW
// hop (see formDataWire.ts). Installed once per test process.
installFormDataWire();

beforeAll(() => {
  // The mock backend paces a run so mock mode looks like a real one; tests do not need
  // to sit through it.
  setStreamPace(0, 0);
  server.listen({ onUnhandledRequest: 'error' });
});

// Tests run in English, whatever the app's default is. The dictionary itself has its
// own guards (the type alignment, the entry-by-entry comparison test, and
// languageSwitch.test.tsx proving the toggle works); every other test is about
// behavior, and pinning one language keeps its assertions from tracking copy edits
// in the other. beforeEach, not beforeAll: a test that switches language must not
// leak its choice into the next one. (Revises ADR-0012's "tests stay on the Chinese
// default" — that held only while these strings were not in the dictionary at all.)
beforeEach(() => {
  useLanguageStore.setState({ language: 'en' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  localStorage.setItem('erd_user_id', TEST_USER_ID);
});

afterAll(() => server.close());
