import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';

import { StudioPage } from './StudioPage';

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

function recentGroup() {
  return within(screen.getByRole('region', { name: 'Recents sessions' }));
}

/** The rail suspends on the session list; every case starts from a settled one. */
async function openStudio() {
  renderStudioPage();
  await screen.findByRole('region', { name: 'Recents sessions' });
}

/** The backend has no POST /sessions: a session is created by the first message that
 *  names it (ADR-0008). "New chat" therefore opens a draft that lives only in this
 *  client until then. */
describe('New chat opens a client-side draft', () => {
  beforeEach(() => {
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('lands with the most recent session open, ready to type', async () => {
    renderStudioPage();

    // No click needed: the composer is there because a session already is.
    expect(await screen.findByRole('textbox', { name: 'Message' })).toBeInTheDocument();
    // Scoped to the rail's session groups (Pinned + Recents): the thread's Artifact
    // chip legitimately carries its own aria-current for "the version on the pane".
    const selectedRows = screen
      .getAllByRole('region', { name: /sessions$/ })
      .flatMap((group) => [...group.querySelectorAll('[aria-current="true"]')]);
    expect(selectedRows).toHaveLength(1);
  });

  it('opens a draft by itself when there is no session to land on', async () => {
    server.use(http.get('/api/sessions', () => HttpResponse.json([])));
    renderStudioPage();

    expect(await screen.findByRole('textbox', { name: 'Message' })).toBeInTheDocument();
    expect(await recentGroup().findByText('New analysis')).toBeInTheDocument();
  });

  it('never asks the backend to create a session', async () => {
    let createCalls = 0;
    server.use(
      http.post('/api/sessions', () => {
        createCalls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    await openStudio();
    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));

    expect(await recentGroup().findByText('New analysis')).toBeInTheDocument();
    expect(createCalls).toBe(0);
  });

  it('shows the draft at the top of Recent and selects it', async () => {
    await openStudio();
    const before = recentGroup().getAllByRole('listitem').length;

    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));

    const rows = await recentGroup().findAllByRole('listitem');
    expect(rows).toHaveLength(before + 1);
    expect(within(rows[0]).getByText('New analysis')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: 'New analysis' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('opens an empty thread rather than another session history', async () => {
    await openStudio();
    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));

    expect(await screen.findByText('Start an analysis')).toBeInTheDocument();
    expect(screen.queryByRole('log', { name: 'Messages' })).not.toBeInTheDocument();
  });

  it('offers no rename, pin or delete on a draft — there is nothing to act on yet', async () => {
    await openStudio();
    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));

    const draftRow = (await recentGroup().findAllByRole('listitem'))[0];
    expect(
      within(draftRow).queryByRole('button', { name: /More actions/ }),
    ).not.toBeInTheDocument();
  });

  it('becomes a real session once its first message is sent', async () => {
    await openStudio();
    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
    await screen.findByRole('textbox', { name: 'Message' });

    await userEvent.click(screen.getByRole('button', { name: 'SPC analysis' }));

    // Its row now carries the actions a persisted session has.
    const draftRow = (await recentGroup().findAllByRole('listitem'))[0];
    expect(
      await within(draftRow).findByRole('button', { name: /More actions/ }),
    ).toBeInTheDocument();
  });

  it('does not stack a second draft when New chat is pressed again', async () => {
    await openStudio();
    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
    const afterFirst = (await recentGroup().findAllByRole('listitem')).length;

    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));

    expect(recentGroup().getAllByRole('listitem')).toHaveLength(afterFirst);
  });
});
