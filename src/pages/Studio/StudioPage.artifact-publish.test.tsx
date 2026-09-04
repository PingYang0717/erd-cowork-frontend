import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { renderStudio } from '@/test/renderStudio';
import { publishArtifactAs } from '@/test/studioRun';

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
    expect(await screen.findByText('Published')).toBeInTheDocument();

    // Regenerating produces a new, not-yet-published version.
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');

    await screen.findByRole('button', { name: 'Publish Artifact' });
    expect(screen.queryByText('Published')).not.toBeInTheDocument();

    await publishArtifactAs(user);

    expect(await screen.findByText('Published')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish Artifact' })).not.toBeInTheDocument();
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
      })
    );

    const user = userEvent.setup();
    renderStudio();
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await screen.findByRole('button', { name: 'Publish Artifact' });
    const fetchesBeforePublish = contentFetches;

    await publishArtifactAs(user);
    await screen.findByText('Published');
    // The list refetch (publishedAt badge) has landed by now; give any stray content
    // refetch the same window before counting.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Publish Artifact' })).toBeNull());

    expect(contentFetches).toBe(fetchesBeforePublish);
  });

  it('opens the share dialog from the toolbar', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('Published');

    await user.click(screen.getByRole('button', { name: 'Share artifact' }));
    expect(await screen.findByRole('dialog', { name: /Share/ })).toBeInTheDocument();
  });

  /** The Gallery names a card by its title, so publishing asks for one — and refuses to
   *  go ahead without it. A card with no name is one nobody finds again. */
  it('asks for a name before publishing, and will not publish without one', async () => {
    const user = userEvent.setup();
    let published: unknown;
    server.use(
      http.post('/api/artifacts/:id/publish', async ({ request }) => {
        published = await request.json();
        return new HttpResponse(null, { status: 200 });
      })
    );
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('Published');
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Publish Artifact' }));
    const nameField = await screen.findByLabelText('Name');

    // Emptied, the confirm closes.
    await user.clear(nameField);
    expect(screen.getByRole('button', { name: /^Publish$/ })).toBeDisabled();

    await user.type(nameField, '8 月 A14 良率追蹤');
    await user.click(screen.getByRole('button', { name: /^Publish$/ }));

    await waitFor(() => expect(published).toEqual({ title: '8 月 A14 良率追蹤' }));
  });

  /** Outputs in one conversation are independent Artifacts, not v1/v2/v3 of a single
   *  thing — asking for "the same but with CPK" produces a new Artifact that can be
   *  published on its own. Numbering them as versions read as a lineage that is not
   *  there, so the menu names them by what they are and when they were made. */
  it('names the conversation outputs by title and time, not as numbered versions', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('Published');
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await screen.findByRole('button', { name: 'Publish Artifact' });

    await user.click(await screen.findByRole('button', { name: 'Switch Artifact' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items.length).toBeGreaterThan(1);
    for (const item of items) {
      expect(item.textContent ?? '').not.toMatch(/\bv\d+\b/);
    }
  });

  /** Publication is what sharing rests on: a recipient's access is access to a published
   *  Artifact. So there is nothing to share until the owner
   *  publishes — the entry stays visible (it teaches the relationship) but does nothing. */
  it('will not share a version that has not been published yet', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('Published');

    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await screen.findByRole('button', { name: 'Publish Artifact' });

    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Share artifact' }));
    expect(screen.queryByRole('dialog', { name: /分享/ })).not.toBeInTheDocument();
  });

  it('keeps each version’s published state independent when switching versions', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('Published');

    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Regenerate the dashboard.{Enter}');
    await screen.findByRole('button', { name: 'Publish Artifact' });

    // Switch back to the seeded, already-published first output: the chip returns.
    await user.click(await screen.findByRole('button', { name: 'Switch Artifact' }));
    await user.click((await screen.findAllByRole('menuitem')).at(-1) as HTMLElement);
    expect(await screen.findByText('Published')).toBeInTheDocument();

    // And the newer output is still unpublished when switching to it again.
    await user.click(await screen.findByRole('button', { name: 'Switch Artifact' }));
    await user.click((await screen.findAllByRole('menuitem'))[0]);
    expect(await screen.findByRole('button', { name: 'Publish Artifact' })).toBeInTheDocument();
  });
});
