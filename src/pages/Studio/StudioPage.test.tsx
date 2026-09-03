import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { appWrapper } from '@/test/appHarness';
import { renderStudio } from '@/test/renderStudio';

// Reload simulation: vi.resetModules() + a fresh import gives a fresh
// useStudioLayoutStore instance (module-scoped), so both StudioShell (rail
// width) and StudioPage (thread width) must be re-imported together for the
// "resets on reload" tests to exercise a genuinely fresh store.
const renderReloadedStudioPage = async () => {
  vi.resetModules();
  const { default: ReloadedStudioShell } = await import('@/components/layouts/StudioShell');
  const { default: ReloadedStudioPage } = await import('./StudioPage');
  return render(
    <MemoryRouter initialEntries={['/cowork']}>
      <Routes>
        <Route path="/cowork" element={<ReloadedStudioShell />}>
          <Route index element={<ReloadedStudioPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { wrapper: appWrapper({ retry: true }) },
  );
};

describe('StudioPage three-pane layout', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
  });

  it('renders the session rail, thread, and artifact panels', () => {
    renderStudio();

    expect(screen.getByRole('navigation', { name: 'Session list' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Thread' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Artifact panel' })).toBeInTheDocument();
  });

  it('resizes the session rail by dragging its handle, clamped to the 200-460px bounds', () => {
    renderStudio();

    const rail = screen.getByRole('navigation', { name: 'Session list' });
    const handle = screen.getByRole('separator', { name: 'Resize session rail' });
    expect(rail.style.width).toBe('270px');

    fireEvent.pointerDown(handle, { clientX: 300 });
    fireEvent.pointerMove(window, { clientX: 360, buttons: 1 });
    fireEvent.pointerUp(window);

    expect(rail.style.width).toBe('330px');

    fireEvent.pointerDown(handle, { clientX: 360 });
    fireEvent.pointerMove(window, { clientX: 2000, buttons: 1 });
    fireEvent.pointerUp(window);

    expect(rail.style.width).toBe('460px');
  });

  it('resizes the thread panel by dragging its handle, clamped to the 320-720px bounds', () => {
    renderStudio();

    const thread = screen.getByRole('region', { name: 'Thread' });
    const handle = screen.getByRole('separator', { name: 'Resize thread panel' });
    expect(thread.style.width).toBe('430px');

    fireEvent.pointerDown(handle, { clientX: 300 });
    fireEvent.pointerMove(window, { clientX: 200, buttons: 1 });
    fireEvent.pointerUp(window);

    expect(thread.style.width).toBe('330px');

    fireEvent.pointerDown(handle, { clientX: 200 });
    fireEvent.pointerMove(window, { clientX: -1000, buttons: 1 });
    fireEvent.pointerUp(window);

    expect(thread.style.width).toBe('320px');
  });

  it('collapses the session rail to an icon-only rail and expands it back', async () => {
    const user = userEvent.setup();
    renderStudio();

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

  /** Language and theme live only in the rail now, so they have to survive it collapsing
   *  — otherwise a collapsed rail puts them out of reach until the user thinks to expand
   *  it again. */
  it('offers Settings in both rail states', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('radio', { name: en.settings.languageEn })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Collapse session list' }));

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('radio', { name: en.settings.languageEn })).toBeInTheDocument();
  });

  /** The collapse state persists now, so "reload while collapsed" is an ordinary
   *  path — and the collapsed rail reads the same suspense query as the expanded one.
   *  Without its own boundary a failing sessions fetch had nothing above it to catch:
   *  the whole page unmounted to blank, the worst of all three failures (no message,
   *  no screen, no data). */
  it('shows an error card — not a blank page — when sessions fail with the rail collapsed', async () => {
    useStudioLayoutStore.setState({ isSessionRailCollapsed: true });
    server.use(http.get('/api/sessions', () => new HttpResponse(null, { status: 500 })));
    // retry off: the assertion is about the card appearing, not about waiting out backoff.
    renderStudio({ retry: false });

    expect(await screen.findByText(en.errors.loadFailedHeading)).toBeInTheDocument();
    // The rest of the shell survives alongside the failed rail.
    expect(screen.getByRole('banner', { name: 'Thread header' })).toBeInTheDocument();
  });

  /** The divider used to be pointer-only: role="separator" with no tabIndex and no
   *  keys, so a keyboard user could not move any boundary at all (A-4). One arrow
   *  press is a complete one-step drag through the same read→move→commit protocol. */
  it('resizes the rail by keyboard, and reports its position as a separator value', async () => {
    const user = userEvent.setup();
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    const handle = screen.getByRole('separator', { name: 'Resize session rail' });
    expect(handle).toHaveAttribute('aria-valuenow', '270');
    expect(handle).toHaveAttribute('aria-valuemin', '200');
    expect(handle).toHaveAttribute('aria-valuemax', '460');

    handle.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('navigation', { name: 'Session list' }).style.width).toBe('286px');
    expect(handle).toHaveAttribute('aria-valuenow', '286');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(handle).toHaveAttribute('aria-valuenow', '254');
  });

  /** The collapsed rail's history flyout claims role="dialog"; a dialog receives
   *  focus, closes on Escape, and hands focus back to its opener (A-6) — before
   *  this, focus stayed on the button behind the backdrop and Escape did nothing. */
  it('treats the chat-history flyout as a real dialog: focus in, Escape out', async () => {
    const user = userEvent.setup();
    renderStudio();
    await screen.findByRole('button', { name: 'New chat' });

    await user.click(screen.getByRole('button', { name: 'Collapse session list' }));
    const historyButton = screen.getByRole('button', { name: 'Chat history' });
    await user.click(historyButton);

    const dialog = await screen.findByRole('dialog', { name: 'Chat history' });
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Chat history' })).not.toBeInTheDocument();
    expect(historyButton).toHaveFocus();
  });

  /** A layout someone dragged into shape is a preference, like the theme beside it —
   *  losing it on every reload made the drag pointless. (The previous version of this
   *  test asserted reset-on-reload "per architecture.md"; that document never actually
   *  recorded such a decision, and the store persists now, same key discipline as
   *  theme/language: constants/storage.ts.) */
  it('keeps panel widths across a reload — a dragged layout is a preference', async () => {
    renderStudio();

    fireEvent.pointerDown(screen.getByRole('separator', { name: 'Resize session rail' }), {
      clientX: 300,
    });
    fireEvent.pointerMove(window, { clientX: 360, buttons: 1 });
    fireEvent.pointerUp(window);
    expect(screen.getByRole('navigation', { name: 'Session list' }).style.width).toBe('330px');

    await renderReloadedStudioPage();

    expect(screen.getAllByRole('navigation', { name: 'Session list' })[1].style.width).toBe(
      '330px',
    );
  });
});

describe('Session rail', () => {
  beforeEach(() => {
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('shows seeded sessions grouped into Pinned and Recent sections', async () => {
    renderStudio();

    const pinned = await screen.findByRole('region', { name: 'Pinned sessions' });
    expect(within(pinned).getByRole('button', { name: 'SPC — Vt (gate CD)' })).toBeInTheDocument();

    const recent = screen.getByRole('region', { name: 'Recents sessions' });
    expect(within(recent).getByRole('button', { name: 'Defect pareto — W12' })).toBeInTheDocument();
  });

  it('keeps the session groups in a scrollable region separate from the fixed New chat and nav rows', async () => {
    renderStudio();

    await screen.findByRole('region', { name: 'Pinned sessions' });
    const scroll = screen.getByTestId('session-scroll');
    expect(within(scroll).getByRole('region', { name: 'Pinned sessions' })).toBeInTheDocument();
    expect(within(scroll).getByRole('region', { name: 'Recents sessions' })).toBeInTheDocument();
    // The fixed rows stay outside the scrolling region.
    expect(within(scroll).queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument();
    expect(within(scroll).queryByRole('button', { name: /^Schedule/ })).not.toBeInTheDocument();
  });

  it('keeps the Recents header visible when there are no recent sessions, with an empty-state line', async () => {
    // Every session pinned, so Recents is empty — stubbed directly rather than pinning
    // through the UI, because the pinned/unpinned split is this test's input, not the
    // behaviour it verifies.
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
    renderStudio();

    const recents = await screen.findByRole('region', { name: 'Recents sessions' });
    expect(await within(recents).findByText('No recent chats.')).toBeInTheDocument();
  });

  it('creates a new session via "New chat" and selects it', async () => {
    const user = userEvent.setup();
    renderStudio();

    await screen.findByRole('region', { name: 'Pinned sessions' });
    const previouslySelected = screen.getByRole('button', { name: 'Defect pareto — W12' });
    expect(previouslySelected).not.toHaveAttribute('aria-current', 'true');

    await user.click(await screen.findByRole('button', { name: 'New chat' }));

    const recent = screen.getByRole('region', { name: 'Recents sessions' });
    const newSession = await within(recent).findByRole('button', { name: 'New analysis' });
    expect(newSession).toHaveAttribute('aria-current', 'true');
    expect(previouslySelected).not.toHaveAttribute('aria-current', 'true');
  });
});
