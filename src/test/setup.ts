import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
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
