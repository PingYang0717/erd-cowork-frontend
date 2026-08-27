import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { setStreamPace } from '@/mocks/handlers';
import { server } from '@/mocks/server';

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

beforeAll(() => {
  // The mock backend paces a run so mock mode looks like a real one; tests do not need
  // to sit through it.
  setStreamPace(0, 0);
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});

afterAll(() => server.close());
