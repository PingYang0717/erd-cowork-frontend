import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';
import { answerAnalysisConditions, publishArtifactAs } from '@/test/studioRun';

function artifactsNav() {
  // Name starts with the label ("Artifacts" + badge count); the toast's
  // 前往 Artifacts button doesn't match the anchor.
  return screen.findByRole('button', { name: /^Artifacts/ });
}

describe('Publish feedback: badge count, coach highlight, toast', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('counts only published Artifacts in the rail badge, increments on publish, coaches the nav entry, and offers a toast', async () => {
    const user = userEvent.setup();
    renderStudio();

    // All three seeded Artifacts are published.
    // The rail suspends until the Artifacts list arrives, so wait for it first.
    expect(await within(await artifactsNav()).findByText('3')).toBeInTheDocument();

    // A regenerated (unpublished) version does not change the count, but the
    // artifact needs publishing: use a brand-new artifact via the composer.
    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await waitForComposer();
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);

    // The new artifact arrives unpublished once the steps animation finishes.
    await screen.findByRole('button', { name: '發布 Artifact' }, { timeout: 5000 });
    expect(within(await artifactsNav()).getByText('3')).toBeInTheDocument();
    expect(await artifactsNav()).not.toHaveAttribute('data-coach');

    await publishArtifactAs(user);

    // Badge +1, coach highlight on, toast with both actions.
    expect(await within(await artifactsNav()).findByText('4')).toBeInTheDocument();
    expect(await artifactsNav()).toHaveAttribute('data-coach', 'true');

    const toast = await screen.findByRole('status', { name: 'Artifact 已發布' });
    expect(within(toast).getByRole('button', { name: '前往 Artifacts' })).toBeInTheDocument();
    expect(within(toast).getByRole('button', { name: '知道了' })).toBeInTheDocument();
  });

  /** The coach points at the Artifacts entry; arriving there is what it was asking for,
   *  so that is where it ends — however the user got there. Reaching the Gallery by
   *  pressing the entry itself, rather than through the toast, used to leave the
   *  highlight pulsing for the rest of the session. */
  it('stops coaching once the user reaches the Gallery by the rail entry', async () => {
    const user = userEvent.setup();
    renderStudio();
    await within(await artifactsNav()).findByText('3');

    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await waitForComposer();
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);
    await screen.findByRole('button', { name: '發布 Artifact' }, { timeout: 5000 });
    await publishArtifactAs(user);
    expect(await artifactsNav()).toHaveAttribute('data-coach', 'true');

    // The rail entry, not the toast's shortcut.
    await user.click(await artifactsNav());

    await waitFor(async () => expect(await artifactsNav()).not.toHaveAttribute('data-coach'));
  });

  it('知道了 dismisses the toast and coach; 前往 Artifacts navigates to the gallery', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await waitForComposer();
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);
    await screen.findByRole('button', { name: '發布 Artifact' }, { timeout: 5000 });
    await publishArtifactAs(user);

    const toast = await screen.findByRole('status', { name: 'Artifact 已發布' });
    await user.click(within(toast).getByRole('button', { name: '知道了' }));
    expect(screen.queryByRole('status', { name: 'Artifact 已發布' })).not.toBeInTheDocument();
    expect(await artifactsNav()).not.toHaveAttribute('data-coach');

    // Publish another version to bring the toast back, then navigate.
    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    await screen.findByRole('button', { name: '發布 Artifact' });
    await publishArtifactAs(user);
    const toast2 = await screen.findByRole('status', { name: 'Artifact 已發布' });
    await user.click(within(toast2).getByRole('button', { name: '前往 Artifacts' }));

    expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
  });
});
