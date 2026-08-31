import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { renderStudio } from '@/test/renderStudio';

describe('Per-version Artifact publishing', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  // 發布 = 開放給別人使用。The button the mockup labels 生成 Artifact is what does it,
  // and `publishedAt` is what it sets — not to be confused with 重新生成, which asks the
  // Agent for a whole new version.
  it('offers 發布 Artifact for a fresh (regenerated) version, and publishing flips it to 已發布', async () => {
    const user = userEvent.setup();
    renderStudio();

    // The seeded session's latest version is already published.
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    expect(await screen.findByText('已發布')).toBeInTheDocument();

    // Regenerating produces a new, not-yet-published version.
    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );

    const publishButton = await screen.findByRole('button', { name: '發布 Artifact' });
    expect(screen.queryByText('已發布')).not.toBeInTheDocument();

    await user.click(publishButton);

    expect(await screen.findByText('已發布')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '發布 Artifact' })).not.toBeInTheDocument();
  });

  /** The regression this pins down: the content HTML's query key once lived under the
   *  `['artifacts', …]` prefix, so publish (which invalidates the artifact list) dragged
   *  a full re-download of the rendered document with it — for a mutation that only
   *  changes metadata. The content key lives in its own namespace now
   *  (artifactContentQueryKey), and this counts the wire to keep it that way. */
  it('publishing does not re-download the artifact HTML', async () => {
    let contentFetches = 0;
    server.use(
      // Counting tap: returning undefined falls through to the real handler, so the
      // response is untouched — only the wire is observed.
      http.get('/api/artifacts/:id', () => {
        contentFetches += 1;
        return undefined;
      }),
    );

    const user = userEvent.setup();
    renderStudio();
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    const publishButton = await screen.findByRole('button', { name: '發布 Artifact' });
    const fetchesBeforePublish = contentFetches;

    await user.click(publishButton);
    await screen.findByText('已發布');
    // The list refetch (publishedAt badge) has landed by now; give any stray content
    // refetch the same window before counting.
    await waitFor(() => expect(screen.queryByRole('button', { name: '發布 Artifact' })).toBeNull());

    expect(contentFetches).toBe(fetchesBeforePublish);
  });

  it('opens the share dialog from the toolbar', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已發布');

    await user.click(screen.getByRole('button', { name: 'Share artifact' }));
    expect(await screen.findByRole('dialog', { name: /分享/ })).toBeInTheDocument();
  });

  /** Publication is what sharing rests on: a recipient's access is access to a published
   *  Artifact, and unpublishing revokes it. So there is nothing to share until the owner
   *  publishes — the entry stays visible (it teaches the relationship) but does nothing. */
  it('will not share a version that has not been published yet', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已發布');

    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    await screen.findByRole('button', { name: '發布 Artifact' });

    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Share artifact' }));
    expect(screen.queryByRole('dialog', { name: /分享/ })).not.toBeInTheDocument();
  });

  it('keeps each version’s published state independent when switching versions', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已發布');

    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    await screen.findByRole('button', { name: '發布 Artifact' });

    // Switch back to the seeded, already-published v1: the chip returns.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/ }));
    expect(await screen.findByText('已發布')).toBeInTheDocument();

    // And v2 is still unpublished when switching to it again.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v2/ }));
    expect(await screen.findByRole('button', { name: '發布 Artifact' })).toBeInTheDocument();
  });
});
