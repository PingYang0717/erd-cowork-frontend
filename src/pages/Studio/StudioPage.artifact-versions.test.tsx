import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { renderStudio } from '@/test/renderStudio';

const artifactSrcdoc = () => {
  return (screen.getByTitle('Artifact preview') as HTMLIFrameElement).getAttribute('srcdoc');
};

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
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await expect.poll(artifactSrcdoc, { timeout: 5000 }).toContain('· v2');

    // Switching back to the first output re-renders the iframe with its HTML. The menu
    // is newest-first, so the earlier output is the last row.
    await user.click(screen.getByRole('button', { name: 'Switch Artifact' }));
    await user.click((await screen.findAllByRole('menuitem')).at(-1) as HTMLElement);
    await expect.poll(artifactSrcdoc).toContain('· v1');
  });

  /** An Artifact's HTML is immutable once produced, so going back to a version already
   *  seen must serve it from cache — the third fetch this counts against was a full
   *  document re-downloaded for nothing on every switch back. */
  it('switching back to a version already seen does not re-download it', async () => {
    let contentFetches = 0;
    server.use(
      // Counting tap: returning undefined falls through to the real handler.
      http.get('/api/artifacts/:id', () => {
        contentFetches += 1;
        return undefined;
      })
    );
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await expect.poll(artifactSrcdoc).toContain('· v1');
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await expect.poll(artifactSrcdoc, { timeout: 5000 }).toContain('· v2');
    const fetchesForBoth = contentFetches;

    // Back to the first output: same document, already in hand.
    await user.click(screen.getByRole('button', { name: 'Switch Artifact' }));
    await user.click((await screen.findAllByRole('menuitem')).at(-1) as HTMLElement);
    await expect.poll(artifactSrcdoc).toContain('· v1');

    expect(contentFetches).toBe(fetchesForBoth);
  });

  it('shows the custom menu: header row, current-output highlight, per-row time, and published checks', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByTitle('Artifact preview');

    // Iterate so the menu holds mixed published states (the seeded one is published,
    // the fresh one is not).
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await screen.findByRole('button', { name: 'Publish Artifact' });

    await user.click(screen.getByRole('button', { name: 'Switch Artifact' }));

    const menu = await screen.findByRole('menu');
    // The header sits in the popup but OUTSIDE the menu role — a menu's children may
    // only be items, and the title div used to be an illegal child (A-2).
    expect(screen.getByText(en.artifact.versionMenuTitle(2))).toBeInTheDocument();
    expect(within(menu).queryByText(en.artifact.versionMenuTitle(2))).not.toBeInTheDocument();

    // Newest first: the fresh output leads, the seeded one is last.
    const rows = within(menu).getAllByRole('menuitem');
    const current = rows[0];
    const seededRow = rows[rows.length - 1];
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(seededRow).not.toHaveAttribute('aria-current', 'true');

    // The published seeded output carries the green check; the fresh one does not.
    expect(within(seededRow).getByLabelText('Published')).toBeInTheDocument();
    expect(within(current).queryByLabelText('Published')).not.toBeInTheDocument();

    // The seeded output's timestamp (2026-08-20) renders in its row; the relative
    // format shows a weekday within a week of "now", the date beyond that.
    expect(within(seededRow).getByText(/^(Thu|Aug 20)$/)).toBeInTheDocument();

    // The row reads `vN` then the title. `version` is a number on the wire (confirmed
    // 2026-09-03), so this is a straight render — the digit-parsing that stood in while
    // the field was thought to be worded is gone.
    expect(within(seededRow).getByText('v1')).toBeInTheDocument();

    // The tick sits before the time, so the times line up as a column whether or not a
    // row is published — with the tick last, a published row pushed its time left.
    const seededChildren = [...seededRow.children].map((child) => child.className);
    const tickAt = seededChildren.findIndex((c) => c.includes('versionMenuItemCheck'));
    const timeAt = seededChildren.findIndex((c) => c.includes('versionMenuItemTime'));
    expect(tickAt).toBeGreaterThanOrEqual(0);
    expect(tickAt).toBeLessThan(timeAt);
  });

  /** The number used to come from the artifacts list, and nothing refetches that list
   *  when a run ends — so the Artifact just produced sat in the menu as a title with no
   *  mark beside it, while every older row had one. Deriving the number from the
   *  messages needs nothing that has not already arrived. */
  it('numbers an Artifact the moment the run produces it', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByTitle('Artifact preview');
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await screen.findByRole('button', { name: 'Publish Artifact' });

    await user.click(screen.getByRole('button', { name: 'Switch Artifact' }));

    const rows = within(await screen.findByRole('menu')).getAllByRole('menuitem');
    // Newest first: the one this run produced leads.
    expect(within(rows[0]).getByText('v2')).toBeInTheDocument();
    expect(within(rows[rows.length - 1]).getByText('v1')).toBeInTheDocument();
  });

  /** The menu-button keyboard contract (A-2): opening focuses the current item,
   *  arrows move between items, Escape closes and puts focus back on the trigger —
   *  in a three-pane layout, focus dropped to <body> is a position lost entirely. */
  it('is keyboard-operable: focus moves in, arrows navigate, Escape restores the trigger', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByTitle('Artifact preview');
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await screen.findByRole('button', { name: 'Publish Artifact' });

    const trigger = screen.getByRole('button', { name: 'Switch Artifact' });
    await user.click(trigger);

    // Focus lands on the current version, not the top of the list.
    const rows = await screen.findAllByRole('menuitem');
    expect(rows[0]).toHaveAttribute('aria-current', 'true');
    expect(rows[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(rows[1]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    // Wraps rather than falling off the end.
    expect(rows[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(rows[1]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
