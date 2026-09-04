import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

/** Unpublishing takes an Artifact off the Gallery's shelf and nothing more. It is not a
 *  delete: the Artifact goes on living in the conversation that produced it, which is
 *  the whole reason the action is named for what it does. */
describe('Unpublishing an Artifact from the Gallery', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useActiveRunStore.setState(useActiveRunStore.getInitialState());
  });

  it('removes it from the Gallery but leaves it working in its own conversation', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await waitForComposer();
    await screen.findByTitle('Artifact preview');

    await user.click(screen.getByRole('button', { name: /^Artifacts/ }));
    await user.click(await screen.findByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    // The destructive step now sits behind a confirm — click through it.
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' })).not.toBeInTheDocument()
    );

    // Back in the conversation it came from, it is still there and still rendered: what
    // it lost is its listing, not its existence.
    await user.click(screen.getByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await waitForComposer();
    const frame = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(frame.getAttribute('srcdoc')).toContain('SPC analysis');

    // And it is offered for publishing again, since it is no longer published.
    expect(await screen.findByRole('button', { name: 'Publish Artifact' })).toBeInTheDocument();
  });
});
