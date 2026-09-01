import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { renderStudio } from '@/test/renderStudio';

function artifactSrcdoc() {
  return (screen.getByTitle('Artifact preview') as HTMLIFrameElement).getAttribute('srcdoc');
}

/** Versions are derived from the session's artifact-bearing messages (cowork master's
 *  model): every regenerate is a chat turn that yields a new artifact, and that
 *  artifact is the next version. */
describe('Artifact version switcher', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('derives the conversation outputs from the history; iterating appends one and switching back re-renders the earlier', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    // The seeded session has one artifact-bearing message → one output. The `· vN`
    // marker below is the mock fixture's own content, which is how a test tells the two
    // documents apart — it is not the switcher's labelling.
    await screen.findByTitle('Artifact preview');
    await expect.poll(artifactSrcdoc).toContain('· v1');

    // An iteration typed into the composer lands as a second output and takes the panel.
    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    await expect.poll(artifactSrcdoc, { timeout: 5000 }).toContain('· v2');

    // Switching back to the first output re-renders the iframe with its HTML. The menu
    // is newest-first, so the earlier output is the last row.
    await user.click(screen.getByRole('button', { name: '切換產出' }));
    await user.click((await screen.findAllByRole('menuitem')).at(-1) as HTMLElement);
    await expect.poll(artifactSrcdoc).toContain('· v1');
  });

  it('shows the custom menu: header row, current-output highlight, per-row time, and published checks', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByTitle('Artifact preview');

    // Iterate so the menu holds mixed published states (the seeded one is published,
    // the fresh one is not).
    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    await screen.findByRole('button', { name: '發布 Artifact' });

    await user.click(screen.getByRole('button', { name: '切換產出' }));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('此對話的產出 · 共 2 個，可切換後再發布')).toBeInTheDocument();

    // Newest first: the fresh output leads, the seeded one is last.
    const rows = within(menu).getAllByRole('menuitem');
    const current = rows[0];
    const seededRow = rows[rows.length - 1];
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(seededRow).not.toHaveAttribute('aria-current', 'true');

    // The published seeded output carries the green check; the fresh one does not.
    expect(within(seededRow).getByLabelText('已發布')).toBeInTheDocument();
    expect(within(current).queryByLabelText('已發布')).not.toBeInTheDocument();

    // The seeded output's timestamp (2026-08-20) renders in its row; the relative
    // format shows a weekday within a week of "now", the date beyond that.
    expect(within(seededRow).getByText(/^(Thu|Aug 20)$/)).toBeInTheDocument();
  });
});
