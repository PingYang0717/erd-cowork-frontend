import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

/** Deleting an Artifact has to reach further than the list it was listed in. The panel
 *  remembers one by id and the rendered HTML is cached under a key that deliberately
 *  sits outside the `['artifacts']` prefix — so neither is touched by invalidating the
 *  list, and the deleted document simply stayed on screen. */
describe('Deleting an Artifact from the Gallery', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useActiveRunStore.setState(useActiveRunStore.getInitialState());
  });

  it('stops the Studio panel from rendering it once the user comes back', async () => {
    const user = userEvent.setup();
    // retry off: a deleted Artifact answers 404, and three exponential backoffs would
    // put the failure well past any reasonable wait.
    renderStudio({ retry: false });

    // Open the session whose artifact we are about to delete, so the panel is holding it.
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await waitForComposer();
    await screen.findByTitle('Artifact preview');
    await waitFor(() =>
      expect(useActiveRunStore.getState().displayedArtifactId).toBe('artifact-1'),
    );

    await user.click(screen.getByRole('button', { name: /^Artifacts/ }));
    await user.click(
      await screen.findByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
      ).not.toBeInTheDocument(),
    );

    // Back to the session it came from. This is the step that matters: leaving the
    // Studio unmounts the panel (which clears the displayed id on its own), so the bug
    // only shows on the way back, when the panel mounts again and finds the deleted
    // document still sitting in the content cache.
    await user.click(screen.getByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await waitForComposer();

    // The deleted document must not be what the frame renders. Its fixture carries the
    // scenario name, which is how a test tells one artifact's HTML from another's.
    await waitFor(() => {
      const frame = screen.queryByTitle('Artifact preview') as HTMLIFrameElement | null;
      expect(frame?.getAttribute('srcdoc') ?? '').not.toContain('SPC');
    });
    // And nothing points at it: the next message would otherwise send it as
    // baseArtifactId, asking the backend to iterate on an artifact it no longer has.
    // Awaited rather than asserted outright — the panel only knows the Artifact is gone
    // once its content fetch has come back 404.
    await waitFor(() =>
      expect(useActiveRunStore.getState().displayedArtifactId).not.toBe('artifact-1'),
    );
    expect(useActiveRunStore.getState().pickedArtifactId).not.toBe('artifact-1');

    // The version switcher survives, so the user can move to one that still exists —
    // an Artifact deleted while still listed as a version must not be a dead end.
    expect(screen.getByText(/已不存在/)).toBeInTheDocument();
  });
});
