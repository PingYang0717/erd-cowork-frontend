import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useActiveRunStore } from '@/stores/useActiveRunStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { renderStudio } from '@/test/renderStudio';
import { answerAnalysisConditions } from '@/test/studioRun';

/** Starts a run over a driven stream and waits for it to put an artifact on screen,
 *  leaving the stream open so the panel is observable mid-run. */
async function runSpcScenarioWithMockStream(
  user: ReturnType<typeof userEvent.setup>,
  stream: ReturnType<typeof mockAgentStream>,
) {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('textbox', { name: 'Message' });
  await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
  act(() => stream.push({ type: 'ARTIFACT', artifactId: 'artifact-1', title: 'SPC analysis' }));
  await screen.findByTitle('Artifact preview');
}

async function runSpcScenario(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await screen.findByRole('textbox', { name: 'Message' });
  await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
  await answerAnalysisConditions(user);
  await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
  return (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
}

/** Reload throws the artifact's document away and mounts a fresh one — the escape hatch
 *  for an artifact whose own script has wedged. It is NOT a Regenerate (no new version)
 *  and NOT a Repair (no agent involved); see CONTEXT.md. */
describe('Artifact Reload', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useActiveRunStore.setState(useActiveRunStore.getInitialState());
  });

  it('mounts a fresh document when the user reloads the artifact', async () => {
    const user = userEvent.setup();
    renderStudio();
    const before = await runSpcScenario(user);

    await user.click(screen.getByRole('button', { name: 'Reload artifact' }));

    await waitFor(() => {
      expect(screen.getByTitle('Artifact preview')).not.toBe(before);
    });
  });

  it('refuses to reload while the agent is still writing the next version', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();
    await runSpcScenarioWithMockStream(user, stream);

    expect(screen.getByRole('button', { name: 'Reload artifact' })).toBeDisabled();

    act(() => stream.close());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reload artifact' })).toBeEnabled(),
    );
  });

  it('mounts a fresh document once a repair has rebuilt the artifact', async () => {
    const user = userEvent.setup();
    renderStudio();
    const before = await runSpcScenario(user);

    act(() => {
      useActiveRunStore.getState().bumpArtifactReload();
    });

    await waitFor(() => {
      expect(screen.getByTitle('Artifact preview')).not.toBe(before);
    });
  });
});
