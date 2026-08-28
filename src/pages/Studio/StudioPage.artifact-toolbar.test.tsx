import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { renderStudio } from '@/test/renderStudio';

describe('Artifact panel toolbar', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('shows a "已發布" badge for a rendered Artifact, with Share live beside it', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    expect(await screen.findByText('已發布')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Share artifact' })).toBeEnabled();
  });

  it('opens the Artifact’s full-page view in a new tab', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await user.click(await screen.findByRole('button', { name: 'Open artifact in new tab' }));

    expect(openSpy).toHaveBeenCalledWith(
      '/cowork/artifact/artifact-1',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
  });

  it('shows the custom delayed tooltip on the Reload button instead of a native title', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    const reload = await screen.findByRole('button', { name: 'Reload artifact' });
    expect(reload).not.toHaveAttribute('title');

    await user.hover(reload);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('重新整理');

    await user.unhover(reload);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('iterates the Artifact via a chat turn, adding and switching to a new version', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    // The seeded session derives a single version from its one artifact message.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    await user.keyboard('{Escape}');

    // An iteration typed into the composer streams a new run whose artifact becomes
    // v2 and takes over (it rides baseArtifactId, so the scenario is inherited).
    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    await screen.findByRole('button', { name: '發布 Artifact' });

    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await expect.poll(() => screen.getAllByRole('menuitem')).toHaveLength(2);
  });
});
