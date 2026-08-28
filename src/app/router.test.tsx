import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// The router reads window.location once at module-evaluation time, so each test puts
// its URL there first and then re-imports the module tree fresh — this doubles as the
// "reload lands on the same screen" check for every route, since a fresh import at a
// URL is exactly what a real reload does.
//
// It is a hash router (ADR-0011), so the route goes in the fragment: pushing the bare
// path would leave the router at `/` and every assertion below would fail on the wrong
// screen rather than on the thing it is testing.
async function renderAppAt(path: string) {
  window.history.pushState({}, '', `#${path}`);
  vi.resetModules();
  const { default: App } = await import('./App');
  return render(<App />);
}

// Every test's vi.resetModules() forces a fresh re-evaluation of the entire
// App module tree (antd, providers, all pages), which regularly pushes past
// the default 5s test timeout under load (V8/antd CSS-in-JS caches don't
// survive resetModules) — hence the longer budget on every test here.
const RESET_MODULES_TIMEOUT = 10000;

describe('Routing shell', () => {
  it(
    'renders the Studio page at /cowork',
    async () => {
      await renderAppAt('/cowork');

      expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
    },
    RESET_MODULES_TIMEOUT,
  );

  it(
    'redirects the root path to /cowork',
    async () => {
      await renderAppAt('/');

      expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/cowork');
    },
    RESET_MODULES_TIMEOUT,
  );

  it(
    'renders the Artifacts gallery page at /cowork/artifacts, with the session rail still visible',
    async () => {
      await renderAppAt('/cowork/artifacts');

      expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Artifacts/ })).toHaveAttribute(
        'aria-current',
        'page',
      );
    },
    RESET_MODULES_TIMEOUT,
  );

  it(
    'renders the Schedule page at /cowork/schedule, with the session rail still visible',
    async () => {
      await renderAppAt('/cowork/schedule');

      expect(await screen.findByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Schedule/ })).toHaveAttribute(
        'aria-current',
        'page',
      );
    },
    RESET_MODULES_TIMEOUT,
  );

  it(
    'renders the Artifact full-page view at /cowork/artifact/:artifactId',
    async () => {
      await renderAppAt('/cowork/artifact/artifact-123');

      // A direct visit has no recorded origin, so the toolbar leads with Home.
      expect(await screen.findByRole('button', { name: 'Home' })).toBeInTheDocument();
    },
    RESET_MODULES_TIMEOUT,
  );

  it(
    "shows the total Artifact count as a badge on the rail's Artifacts shortcut",
    async () => {
      await renderAppAt('/cowork');

      // The badge starts at 0 (before the Artifacts query resolves) and then
      // updates to the real seeded count; findByRole polls until that happens.
      expect(await screen.findByRole('button', { name: /^Artifacts3$/ })).toBeInTheDocument();
    },
    RESET_MODULES_TIMEOUT,
  );

  it(
    'keeps the session rail mounted (not a full navigation) when switching from Studio to Artifacts',
    async () => {
      const user = userEvent.setup();
      await renderAppAt('/cowork');
      await screen.findByRole('button', { name: 'New chat' });

      await user.click(screen.getByRole('button', { name: /^Artifacts/ }));

      expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/cowork/artifacts');
    },
    RESET_MODULES_TIMEOUT,
  );
});
