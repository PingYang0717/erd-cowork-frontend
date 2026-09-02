import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';
import { answerAnalysisConditions } from '@/test/studioRun';

const selectASessionAndRunSpcScenario = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await waitForComposer();

  await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
  await answerAnalysisConditions(user);
  await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
};

describe('Artifact panel', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('renders the produced Artifact HTML in a sandboxed iframe once a scenario completes', async () => {
    const user = userEvent.setup();
    renderStudio();
    await selectASessionAndRunSpcScenario(user);

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
  });

  // The sandbox stops the artifact reaching into this app; the policy stops it reaching
  // out. Both are needed — see utils/artifactCsp.
  it('locks the artifact down with a content-security policy before it loads anything', async () => {
    const user = userEvent.setup();
    renderStudio();
    await selectASessionAndRunSpcScenario(user);

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    const srcdoc = iframe.getAttribute('srcdoc') ?? '';

    expect(srcdoc).toContain("default-src 'none'");
    expect(srcdoc).toContain("connect-src 'none'");
    expect(srcdoc.indexOf('Content-Security-Policy')).toBeLessThan(srcdoc.indexOf('<title>'));
  });
});
