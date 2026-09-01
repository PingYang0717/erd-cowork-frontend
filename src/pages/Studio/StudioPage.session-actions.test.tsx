import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

async function openMenuOf(user: ReturnType<typeof userEvent.setup>, title: string) {
  await screen.findByRole('button', { name: title });
  await user.click(screen.getByRole('button', { name: `More actions for ${title}` }));
}

/** The three session writes go straight to the backend now — no disabled rows, no
 *  後端未支援 hints (the backend is here; an endpoint that is not answers with an
 *  error instead). */
describe('Session row actions', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('renames a session through the menu, and the row shows the new name', async () => {
    const user = userEvent.setup();
    renderStudio();

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));

    const input = await screen.findByRole('textbox', { name: 'Rename Defect pareto — W12' });
    await user.clear(input);
    await user.type(input, 'Pareto — W13{Enter}');

    expect(await screen.findByRole('button', { name: 'Pareto — W13' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Defect pareto — W12' })).not.toBeInTheDocument();
  });

  /** `['sessions']` is a prefix of every detail key, so a non-exact invalidate after a
   *  rename dragged a refetch of whatever session was OPEN along with it — the whole
   *  thread re-downloaded because some other row changed its name. The mutations
   *  invalidate exactly, and this counts the wire to keep them that way. */
  it('renaming one session does not re-download the session that is open', async () => {
    let openDetailFetches = 0;
    server.use(
      // Counting tap: returning undefined falls through to the real handler.
      http.get('/api/sessions/session-1', () => {
        openDetailFetches += 1;
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderStudio();

    // Open session-1, then rename session-2.
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await waitForComposer();
    const fetchesBeforeRename = openDetailFetches;

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const input = await screen.findByRole('textbox', { name: 'Rename Defect pareto — W12' });
    await user.clear(input);
    await user.type(input, 'Pareto — W13{Enter}');
    await screen.findByRole('button', { name: 'Pareto — W13' });

    expect(openDetailFetches).toBe(fetchesBeforeRename);
  });

  it('pins a recent session and finds it under Pinned', async () => {
    const user = userEvent.setup();
    renderStudio();

    const recents = await screen.findByRole('region', { name: 'Recents sessions' });
    expect(
      within(recents).getByRole('button', { name: 'Defect pareto — W12' }),
    ).toBeInTheDocument();

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Pin' }));

    const pinned = screen.getByRole('region', { name: 'Pinned sessions' });
    expect(
      await within(pinned).findByRole('button', { name: 'Defect pareto — W12' }),
    ).toBeInTheDocument();
  });

  /** Deleting the session you are *in* used to leave the selection pointing at it: the
   *  row vanished but the thread stayed, and the next message re-created the session
   *  server-side (ADR-0005 upserts on send) under the default title. The user deleted
   *  something and it came back. */
  it('clears the selection when the open session is deleted, so it cannot be resurrected', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();
    const deletedId = useSessionSelectionStore.getState().selectedSessionId;
    expect(deletedId).toBe('session-2');

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Defect pareto — W12' })).not.toBeInTheDocument(),
    );
    // The selection must no longer be the deleted id. It does not go empty: the landing
    // effect in useSessionGroups opens the most recent remaining conversation, which is
    // the behaviour we want — what matters is that nothing still points at the deleted
    // session, because that is what the next message would resurrect.
    const { selectedSessionId } = useSessionSelectionStore.getState();
    expect(selectedSessionId).not.toBe(deletedId);
    expect(selectedSessionId).toBe('session-1');
  });

  /** New chat → say something → delete it. The session persists on the first message
   *  (ADR-0005), so this deletes a real session that is also the most recent one — and
   *  that is what used to go wrong: clearing the selection let the landing effect pick
   *  the most recent session it could see, and against a list not yet refetched that was
   *  the session just deleted. It came back selected, and the thread carried on
   *  rendering it from cache under its "New analysis" title. */
  it('moves off a just-created session when it is deleted, rather than re-opening it', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await waitForComposer();
    const draftId = useSessionSelectionStore.getState().selectedSessionId;

    await user.type(
      screen.getByRole('textbox', { name: 'Message' }),
      'Run an SPC analysis.{Enter}',
    );
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument(),
      { timeout: 5000 },
    );

    await openMenuOf(user, 'New analysis');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'New analysis' })).not.toBeInTheDocument(),
    );
    const { selectedSessionId, draftStartedAt } = useSessionSelectionStore.getState();
    expect(selectedSessionId).not.toBe(draftId);
    expect(draftStartedAt).toBeNull();
    // The most recent remaining session is open, and its thread is what shows.
    expect(screen.getByRole('button', { name: 'SPC — Vt (gate CD)' })).toBeInTheDocument();
  });

  /** The rail marks the row you are looking at. Leaving for the Gallery does not change
   *  which session is selected — coming back reopens it — but while you are away no row
   *  is the page you are on, and one still marked claims otherwise. */
  it('drops the row highlight while the user is in the Gallery, and restores it on return', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
    await waitForComposer();
    expect(screen.getByRole('button', { name: 'Defect pareto — W12' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /^Artifacts/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Defect pareto — W12' })).not.toHaveAttribute(
        'aria-current',
      ),
    );
    // The selection itself is untouched: the row is still what reopens.
    expect(useSessionSelectionStore.getState().selectedSessionId).toBe('session-2');

    await user.click(screen.getByRole('button', { name: 'Defect pareto — W12' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Defect pareto — W12' })).toHaveAttribute(
        'aria-current',
        'true',
      ),
    );
  });

  it('deletes a session and the row is gone', async () => {
    const user = userEvent.setup();
    renderStudio();

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Defect pareto — W12' })).not.toBeInTheDocument(),
    );
  });
});
