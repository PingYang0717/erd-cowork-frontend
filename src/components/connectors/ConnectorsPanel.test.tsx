import { Suspense } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import { appWrapper } from '@/test/appHarness';
import ConnectorsPanel from './ConnectorsPanel';

const renderPanel = (sessionId = 'session-1', seedDraft = false) => {
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
      connectors: [],
    });
  }
  return render(
    <Suspense fallback={null}>
      <ConnectorsPanel sessionId={sessionId} open onClose={() => {}} />
    </Suspense>,
    { wrapper: appWrapper({ queryClient }) }
  );
};

/** Presses Submit and waits for the write to land. The button goes back to disabled once
 *  the refetched session matches the draft, which is the panel's own signal that there is
 *  nothing left unsaved — steadier than watching for the dialog, which this harness never
 *  closes (its `onClose` is a no-op). */
const submitSelection = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled());
};

const selectedSources = () => {
  return screen.getByRole('dialog').querySelector('[class*="selectedChips"]') as HTMLElement;
};

/** A data source is attached to a conversation, not to the user: the write goes to
 *  PATCH/DELETE /sessions/{id}/data-source, and what a fresh mount reads back is the
 *  session's detail. Two conversations can draw on different sources.
 *
 *  Picking is one decision made out of several clicks, so nothing reaches the server
 *  until Submit — every test here has to press it. */
describe('ConnectorsPanel', () => {
  // Submitting remembers the combination, and the panel opens a session that has chosen
  // nothing on it. That is the feature — but it also means one test's Submit would seed
  // the next test's opening draft.
  beforeEach(() => localStorage.removeItem(CONNECTOR_PREFS_STORAGE_KEY));

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

  /** A connector that cannot be chosen is shown rather than hidden — a source that
   *  vanished from the list tells the reader nothing about why. It reads as unavailable
   *  and its toggle is dead. */
  it('shows a disabled connector, and will not let it be picked', async () => {
    renderPanel();

    const toggle = await screen.findByRole('button', { name: 'Connect Recipe' });
    expect(toggle).toBeDisabled();
    expect(within(screen.getByRole('dialog')).getAllByText('Unavailable').length).toBeGreaterThan(0);
  });

  /** The remembered combination is a default for the dialog and nothing more: it is
   *  offered on a conversation that has chosen nothing, and never written to a session on
   *  the user's behalf. A conversation with its own selection outranks it. */
  it('opens a fresh conversation on the combination last submitted', async () => {
    const user = userEvent.setup();
    // Defect, because the mock's session store persists across this file and the sources
    // the tests above touched are no longer where they started.
    const first = renderPanel('session-1');

    await user.click(await screen.findByRole('button', { name: 'Connect Defect' }));
    await submitSelection(user);
    first.unmount();

    // A conversation with nothing of its own opens on it — as a draft, not as a fact:
    // Submit is dirty, because none of it has reached this session yet.
    renderPanel('draft-never-chosen', true);
    expect(await screen.findByRole('button', { name: 'Disconnect Defect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });
});
