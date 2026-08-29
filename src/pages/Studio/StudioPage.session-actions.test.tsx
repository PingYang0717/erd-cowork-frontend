import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

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
