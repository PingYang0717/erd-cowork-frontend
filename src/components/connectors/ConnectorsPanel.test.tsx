import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';

import { appWrapper } from '@/test/appHarness';

import ConnectorsPanel from './ConnectorsPanel';

function renderPanel(sessionId = 'session-1', seedDraft = false) {
  const queryClient = new QueryClient();
  if (seedDraft) {
    // What openDraft() does: a draft's thread reads this shell until a write persists
    // the session (ADR-0005). Without it the panel's suspense query 404s on mount and
    // the test would be exercising something the app never does.
    queryClient.setQueryData(['sessions', sessionId], {
      id: sessionId,
      title: 'New analysis',
      createdAt: '2026-08-31T00:00:00.000Z',
      messages: [],
      files: [],
      dataSourceIds: [],
    });
  }
  return render(
    <Suspense fallback={null}>
      <ConnectorsPanel sessionId={sessionId} open onClose={() => {}} />
    </Suspense>,
    { wrapper: appWrapper({ queryClient }) },
  );
}

/** Presses Submit and waits for the write to land. The button goes back to disabled once
 *  the refetched session matches the draft, which is the panel's own signal that there is
 *  nothing left unsaved — steadier than watching for the dialog, which this harness never
 *  closes (its `onClose` is a no-op). */
async function submitSelection(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled());
}

function selectedSources() {
  return screen.getByRole('dialog').querySelector('[class*="selectedChips"]') as HTMLElement;
}

/** A data source is attached to a conversation, not to the user: the write goes to
 *  PATCH/DELETE /sessions/{id}/data-source, and what a fresh mount reads back is the
 *  session's detail. Two conversations can draw on different sources.
 *
 *  Picking is one decision made out of several clicks, so nothing reaches the server
 *  until Submit — every test here has to press it. */
describe('ConnectorsPanel', () => {
  it('attaches an available source to the session and reads it back on a fresh mount', async () => {
    const user = userEvent.setup();
    const first = renderPanel();

    // Lot Info seeds as available.
    await user.click(await screen.findByRole('button', { name: 'Connect Lot Info' }));
    expect(within(selectedSources()).getByText('Lot Info')).toBeInTheDocument();
    await submitSelection(user);

    // A fresh tree with a fresh query cache reads the choice back from the session.
    first.unmount();
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Disconnect Lot Info' })).toBeInTheDocument();
    expect(within(selectedSources()).getByText('Lot Info')).toBeInTheDocument();
  });

  /** The point of moving attachment onto the session: what one conversation draws on
   *  says nothing about what another does. Under the old localStorage model this was
   *  impossible — a connect was global to the tab. */
  it('keeps each session\u2019s attachments separate', async () => {
    const user = userEvent.setup();
    const first = renderPanel('session-1');

    await user.click(await screen.findByRole('button', { name: 'Connect Lot Info' }));
    await submitSelection(user);
    first.unmount();

    // session-2 was never given Lot Info, and must not have picked it up.
    renderPanel('session-2');
    expect(await screen.findByRole('button', { name: 'Connect Lot Info' })).toBeInTheDocument();
  });

  /** A draft session exists only in this client until a write lands (ADR-0005).
   *  Attaching a source IS such a write, so it has to bring the session into being —
   *  otherwise the refetch that follows 404s, the panel keeps the old (empty) list, and
   *  the click looks like it did nothing at all. */
  it('attaches a source from a draft session, which has never been written yet', async () => {
    const user = userEvent.setup();
    renderPanel('draft-never-written', true);

    await user.click(await screen.findByRole('button', { name: 'Connect Lot Info' }));
    await submitSelection(user);

    // The write landed on a session the backend had never heard of until it did.
    expect(screen.getByRole('button', { name: 'Disconnect Lot Info' })).toBeInTheDocument();
  });

  it('disconnects a connected source', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Disconnect WAT' }));
    await submitSelection(user);
    expect(screen.getByRole('button', { name: 'Connect WAT' })).toBeInTheDocument();
    expect(within(selectedSources()).queryByText('WAT')).not.toBeInTheDocument();
  });

  it('adds a custom source, connected, and it survives a fresh mount', async () => {
    const user = userEvent.setup();
    const first = renderPanel();

    await screen.findByRole('button', { name: 'Connect Lot Info' });
    await user.type(
      screen.getByRole('textbox', { name: 'Add a custom data source' }),
      'My Team DB',
    );
    await user.click(screen.getByRole('button', { name: /Add/ }));

    // Added and picked, but not yet written.
    expect(
      await screen.findByRole('button', { name: 'Disconnect My Team DB' }),
    ).toBeInTheDocument();
    await submitSelection(user);
    first.unmount();
    renderPanel();
    expect(
      await screen.findByRole('button', { name: 'Disconnect My Team DB' }),
    ).toBeInTheDocument();
  });
});
