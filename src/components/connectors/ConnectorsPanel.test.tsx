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
  // The panel opens a session that has chosen nothing on the user's default sources,
  // which live in this key; one test's defaults must not seed the next's opening draft.
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

  /** A source the conversation already draws on that has since been disabled is still
   *  the conversation's. It opens in the draft, so an untouched Submit has nothing to
   *  write — the panel used to drop it from the draft on open, which made Submit detach
   *  it without saying so. The reader may let go of it; they may not pick it up again. */
  it('keeps a disabled source the conversation already draws on, and submits it unchanged', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    // Recipe is `enabled: false` in the catalogue; this conversation was given it
    // before that happened.
    queryClient.setQueryData(['sessions', 'session-recipe'], {
      id: 'session-recipe',
      title: 'New analysis',
      createdAt: '2026-08-31T00:00:00.000Z',
      messages: [],
      files: [],
      connectors: ['recipe', 'inline'],
    });
    render(
      <Suspense fallback={null}>
        <ConnectorsPanel sessionId="session-recipe" open onClose={() => {}} />
      </Suspense>,
      { wrapper: appWrapper({ queryClient }) }
    );

    // Opens on what the session holds — Recipe included — with nothing to submit.
    const recipeToggle = await screen.findByRole('button', { name: 'Disconnect Recipe' });
    expect(within(selectedSources()).getByText('Recipe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

    // Another change rides along; Recipe goes back to the backend as it was.
    await user.click(screen.getByRole('button', { name: 'Connect Lot Info' }));
    await submitSelection(user);
    expect(screen.getByRole('button', { name: 'Disconnect Recipe' })).toBeInTheDocument();

    // Letting go is allowed; the lock only stops it being picked again.
    await user.click(recipeToggle);
    expect(within(selectedSources()).queryByText('Recipe')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Recipe' })).toBeDisabled();
  });

  /** A conversation draws on one kind of data source (CONTEXT.md, 已選來源). One that has
   *  files and no sources yet still opens the panel — the question card links here — but
   *  the panel only says why, and nothing on it writes: no default offered, no live
   *  toggles, no Submit. */
  it('opens read-only, with the reason, when the conversation has files and no sources', async () => {
    localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ defaultConnectors: ['lot'] }));
    const queryClient = new QueryClient();
    queryClient.setQueryData(['sessions', 'session-with-files'], {
      id: 'session-with-files',
      title: 'New analysis',
      createdAt: '2026-08-31T00:00:00.000Z',
      messages: [],
      files: [
        { id: 'f1', name: 'lots.csv', alias: 'lots', sizeBytes: 512, type: 'text/csv', rowCount: null, expired: false },
      ],
      connectors: [],
    });
    render(
      <Suspense fallback={null}>
        <ConnectorsPanel sessionId="session-with-files" open onClose={() => {}} />
      </Suspense>,
      { wrapper: appWrapper({ queryClient }) }
    );

    expect(await screen.findByRole('status')).toHaveTextContent(/uploaded files/);
    expect(screen.getByRole('button', { name: 'Connect Lot Info' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    // The default is not offered: nothing here may be written.
    expect(within(selectedSources()).queryByText('Lot Info')).not.toBeInTheDocument();
  });

  /** The user's default sources (CONTEXT.md, 預設 Connectors) are a default for the dialog
   *  and nothing more: offered on a conversation that has chosen nothing, never written to
   *  a session on the user's behalf. A conversation with its own selection outranks it. */
  it('opens a fresh conversation on the user’s default sources, as a draft', async () => {
    localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ defaultConnectors: ['defect'] }));

    renderPanel('draft-never-chosen', true);
    expect(await screen.findByRole('button', { name: 'Disconnect Defect' })).toBeInTheDocument();
    // A draft, not a fact: Submit is dirty, because none of it has reached this session.
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
    expect(within(rowOfSource('Defect')).queryByText('Attached')).toBeNull();
  });

  /** The defaults are the user's, set in the preferences. What one conversation submits
   *  is that conversation's choice — it used to become every later conversation's
   *  starting point, so a one-off pick quietly rewrote the default. */
  it('leaves the user’s defaults alone when a conversation submits its own choice', async () => {
    const user = userEvent.setup();
    localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ defaultConnectors: ['defect'] }));
    renderPanel('session-1');

    await user.click(await screen.findByRole('button', { name: 'Connect Lot Info' }));
    await submitSelection(user);

    expect(JSON.parse(localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY)!)).toEqual({ defaultConnectors: ['defect'] });
  });

  /** The earlier shape — the combination last submitted anywhere — is read once as the
   *  starting default, so the move is silent for whoever had one. */
  it('reads the combination remembered by the earlier version as the default', async () => {
    localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ lastSelected: ['lot'] }));

    renderPanel('draft-never-chosen', true);
    expect(await screen.findByRole('button', { name: 'Disconnect Lot Info' })).toBeInTheDocument();
  });
});

const rowOfSource = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^(Connect|Disconnect) ${name}$`) }).closest('li') as HTMLElement;

/** Two facts, not one. What the panel is editing is a *selection*, and Submit is what
 *  turns it into an attachment — so a row can be picked and not yet attached (the
 *  remembered combination a new conversation opens on is exactly that), or attached and
 *  no longer picked (Submit will detach it). Calling the draft "connected" said the
 *  conversation was drawing on sources it had never been given. */
describe('ConnectorsPanel: chosen here vs attached to this conversation', () => {
  beforeEach(() => localStorage.removeItem(CONNECTOR_PREFS_STORAGE_KEY));

  const rowOf = (name: string) =>
    screen.getByRole('button', { name: new RegExp(`^(Connect|Disconnect) ${name}$`) }).closest('li') as HTMLElement;

  it('marks only what the conversation is actually drawing on', async () => {
    const user = userEvent.setup();
    renderPanel();

    // The seeded session draws on Inline; Lot Info it has never been given.
    await screen.findByRole('button', { name: 'Disconnect Inline' });
    expect(within(rowOf('Inline')).getByText('Attached')).toBeInTheDocument();
    expect(within(rowOf('Lot Info')).queryByText('Attached')).toBeNull();

    // Picking one does not attach it — Submit does.
    await user.click(screen.getByRole('button', { name: 'Connect Lot Info' }));
    expect(within(rowOf('Lot Info')).queryByText('Attached')).toBeNull();

    await submitSelection(user);
    expect(within(rowOf('Lot Info')).getByText('Attached')).toBeInTheDocument();
  });

  /** The user's defaults are a convenience, not a claim. A conversation that has been
   *  given nothing must not open saying it is connected to anything. */
  it('opens a new conversation on the user’s defaults without calling them attached', async () => {
    const user = userEvent.setup();
    localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ defaultConnectors: ['lot'] }));

    // A conversation with nothing of its own.
    renderPanel('session-blank', true);
    await screen.findByRole('button', { name: 'Disconnect Lot Info' });

    // Picked for them — and nothing attached until they submit it themselves.
    const panel = screen.getByRole('dialog');
    expect(within(panel).queryByText('Attached')).toBeNull();

    await user.click(within(panel).getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(within(panel).getAllByText('Attached')).not.toHaveLength(0));
  });
});
