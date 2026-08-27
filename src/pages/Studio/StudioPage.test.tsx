import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { BACKEND_UNSUPPORTED } from '@/constants/messages';
import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';

import { StudioPage } from './StudioPage';

// The session rail (StudioShell) is the /cowork route's shared parent, with
// StudioPage as its index route's content — mirrors router.tsx's nesting so
// the rendered tree (and the layout state both share) matches production.
function renderStudioPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Reload simulation: vi.resetModules() + a fresh import gives a fresh
// useStudioLayoutStore instance (module-scoped), so both StudioShell (rail
// width) and StudioPage (thread width) must be re-imported together for the
// "resets on reload" tests to exercise a genuinely fresh store.
async function renderReloadedStudioPage() {
  vi.resetModules();
  const { StudioShell: ReloadedStudioShell } = await import('@/components/layouts/StudioShell');
  const { StudioPage: ReloadedStudioPage } = await import('./StudioPage');
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<ReloadedStudioShell />}>
            <Route index element={<ReloadedStudioPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudioPage three-pane layout', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
  });

  it('renders the session rail, thread, and artifact panels', () => {
    renderStudioPage();

    expect(screen.getByRole('navigation', { name: 'Session list' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Thread' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Artifact panel' })).toBeInTheDocument();
  });

  it('resizes the session rail by dragging its handle, clamped to the 200-460px bounds', () => {
    renderStudioPage();

    const rail = screen.getByRole('navigation', { name: 'Session list' });
    const handle = screen.getByRole('separator', { name: 'Resize session rail' });
    expect(rail.style.width).toBe('270px');

    fireEvent.mouseDown(handle, { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 360 });
    fireEvent.mouseUp(window);

    expect(rail.style.width).toBe('330px');

    fireEvent.mouseDown(handle, { clientX: 360 });
    fireEvent.mouseMove(window, { clientX: 2000 });
    fireEvent.mouseUp(window);

    expect(rail.style.width).toBe('460px');
  });

  it('resizes the thread panel by dragging its handle, clamped to the 320-720px bounds', () => {
    renderStudioPage();

    const thread = screen.getByRole('region', { name: 'Thread' });
    const handle = screen.getByRole('separator', { name: 'Resize thread panel' });
    expect(thread.style.width).toBe('430px');

    fireEvent.mouseDown(handle, { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 200 });
    fireEvent.mouseUp(window);

    expect(thread.style.width).toBe('330px');

    fireEvent.mouseDown(handle, { clientX: 200 });
    fireEvent.mouseMove(window, { clientX: -1000 });
    fireEvent.mouseUp(window);

    expect(thread.style.width).toBe('320px');
  });

  it('collapses the session rail to an icon-only rail and expands it back', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    const rail = screen.getByRole('navigation', { name: 'Session list' });
    expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();
    // Expanded rail shows an Artifact count badge in the button, so its
    // accessible name is "Artifacts <n>" rather than the bare label.
    expect(screen.getByRole('button', { name: /^Artifacts/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse session list' }));

    // Collapsing swaps the full session list for an icon-only rail: "New
    // chat" and the Schedule/Artifacts shortcuts survive as icon tiles
    // (present in both rail states, per the mockup), but the session groups
    // disappear.
    expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Artifacts' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Pinned sessions' })).not.toBeInTheDocument();
    expect(rail.style.width).toBe('52px');
    expect(
      screen.queryByRole('separator', { name: 'Resize session rail' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand session list' }));

    expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();
    expect(rail.style.width).toBe('270px');
  });

  it('keeps panel widths as session-only state that resets on reload, per architecture.md', async () => {
    renderStudioPage();

    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize session rail' }), {
      clientX: 300,
    });
    fireEvent.mouseMove(window, { clientX: 360 });
    fireEvent.mouseUp(window);
    expect(screen.getByRole('navigation', { name: 'Session list' }).style.width).toBe('330px');

    await renderReloadedStudioPage();

    expect(screen.getAllByRole('navigation', { name: 'Session list' })[1].style.width).toBe(
      '270px',
    );
  });
});

describe('Session rail', () => {
  beforeEach(() => {
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('shows seeded sessions grouped into Pinned and Recent sections', async () => {
    renderStudioPage();

    const pinned = await screen.findByRole('region', { name: 'Pinned sessions' });
    expect(within(pinned).getByRole('button', { name: 'SPC — Vt (gate CD)' })).toBeInTheDocument();

    const recent = screen.getByRole('region', { name: 'Recents sessions' });
    expect(within(recent).getByRole('button', { name: 'Defect pareto — W12' })).toBeInTheDocument();
  });

  it('keeps the session groups in a scrollable region separate from the fixed New chat and nav rows', async () => {
    renderStudioPage();

    await screen.findByRole('region', { name: 'Pinned sessions' });
    const scroll = screen.getByTestId('session-scroll');
    expect(within(scroll).getByRole('region', { name: 'Pinned sessions' })).toBeInTheDocument();
    expect(within(scroll).getByRole('region', { name: 'Recents sessions' })).toBeInTheDocument();
    // The fixed rows stay outside the scrolling region.
    expect(within(scroll).queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument();
    expect(within(scroll).queryByRole('button', { name: /^Schedule/ })).not.toBeInTheDocument();
  });

  it('keeps the Recents header visible when there are no recent sessions, with an empty-state line', async () => {
    // Every session pinned, so Recents is empty. Deleting one used to be how this test
    // got here; delete is disabled until the backend has the endpoint (ADR-0009).
    server.use(
      http.get('/api/sessions', () =>
        HttpResponse.json([
          {
            id: 'session-1',
            title: 'SPC — Vt (gate CD)',
            pinnedAt: '2026-08-20T09:05:00.000Z',
            updatedAt: '2026-08-20T09:00:00.000Z',
          },
        ]),
      ),
    );
    renderStudioPage();

    const recents = await screen.findByRole('region', { name: 'Recents sessions' });
    expect(await within(recents).findByText('No recent chats.')).toBeInTheDocument();
  });

  it('creates a new session via "New chat" and selects it', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await screen.findByRole('region', { name: 'Pinned sessions' });
    const previouslySelected = screen.getByRole('button', { name: 'Defect pareto — W12' });
    expect(previouslySelected).not.toHaveAttribute('aria-current', 'true');

    await user.click(await screen.findByRole('button', { name: 'New chat' }));

    const recent = screen.getByRole('region', { name: 'Recents sessions' });
    const newSession = await within(recent).findByRole('button', { name: 'New analysis' });
    expect(newSession).toHaveAttribute('aria-current', 'true');
    expect(previouslySelected).not.toHaveAttribute('aria-current', 'true');
  });

  // Pin, rename and delete were covered by five tests that clicked through the menu and
  // asserted the session moved, was renamed, or disappeared. The backend has none of
  // those endpoints (ADR-0009), so the menu items are disabled and the behaviour they
  // described does not exist to test. What is left to protect is that they are visibly
  // disabled rather than quietly inert — and that nobody re-enables them by accident.
  it('disables pin, rename and delete in a session menu, saying why', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await screen.findByRole('region', { name: 'Pinned sessions' });
    await user.click(screen.getByRole('button', { name: 'More actions for Defect pareto — W12' }));

    for (const label of ['Pin', 'Rename', 'Delete']) {
      const item = screen.getByRole('menuitem', { name: new RegExp(`^${label}`) });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(within(item).getByText(BACKEND_UNSUPPORTED)).toBeInTheDocument();
    }
  });
});
