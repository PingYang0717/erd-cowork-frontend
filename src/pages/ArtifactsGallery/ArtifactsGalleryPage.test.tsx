import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import ArtifactPage from '@/pages/Artifact/ArtifactPage';
import { appWrapper } from '@/test/appHarness';
import type { Artifact } from '@/types/api';

import ArtifactsGalleryPage from './ArtifactsGalleryPage';

/** One Artifact in the fixed contract's shape, for the tests that need to state their
 *  own data rather than take the seeded three. */
const artifactDto = (over: Partial<Artifact> & Pick<Artifact, 'id' | 'title'>): Artifact => {
  return {
    version: 1,
    sessionId: 'session-1',
    sessionTitle: 'SPC — Vt (gate CD)',
    pinnedAt: null,
    publishedAt: '2026-08-20T09:20:00.000Z',
    createdAt: '2026-08-20T09:15:00.000Z',
    owner: 'u-001',
    ownerDisplay: 'Alex Chen',
    isOwn: true,
    isShared: false,
    hasPersonalCopy: false,
    ...over,
  };
};

const renderGalleryPage = () => {
  return render(
    <MemoryRouter>
      <ArtifactsGalleryPage />
    </MemoryRouter>,
    { wrapper: appWrapper({ retry: true }) },
  );
};

describe('Artifacts gallery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists every seeded Artifact under "All", with per-filter counts', async () => {
    renderGalleryPage();

    expect(
      await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inline dashboard — W12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily monitor (A14)' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /^All/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /^Yours/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /^Shared to me/ })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /^Pinned/ })).toHaveTextContent('1');
  });

  /** The Gallery is a shelf of published work. An Artifact the user made but never
   *  published lives in its session's thread and nowhere else — publishing is the
   *  deliberate act that puts it here, and deleting is what takes it back out. */
  it('leaves out an Artifact that was never published, and does not count it', async () => {
    renderGalleryPage();

    expect(
      await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scratch — CPK by lot' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /^Yours/ })).toHaveTextContent('2');
  });

  it('narrows the list per filter, independent of any pin/rename interaction', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(screen.getByRole('button', { name: /^Yours/ }));
    expect(screen.getByRole('button', { name: 'SPC analysis — Vt (gate CD)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inline dashboard — W12' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Daily monitor (A14)' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Shared to me/ }));
    expect(screen.getByRole('button', { name: 'Daily monitor (A14)' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Pinned/ }));
    expect(screen.getByRole('button', { name: 'Inline dashboard — W12' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Daily monitor (A14)' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^All/ }));
    expect(screen.getByRole('button', { name: 'Daily monitor (A14)' })).toBeInTheDocument();
  });

  it('reorders the list via the sort control', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    const orderedCardNames = () => {
      const list = screen.getByRole('list', { name: 'Artifacts' });
      return within(list)
        .getAllByRole('listitem')
        .map((item) => within(item).getAllByRole('button')[0].textContent);
    };

    await user.click(screen.getByRole('button', { name: /Sort:/ }));
    await user.click(screen.getByRole('menuitem', { name: /Name A→Z/ }));

    const namesByNameSort = orderedCardNames();
    expect(namesByNameSort[0]).toContain('Daily monitor');
    expect(namesByNameSort[1]).toContain('Inline dashboard');
    expect(namesByNameSort[2]).toContain('SPC analysis');

    await user.click(screen.getByRole('button', { name: /Sort:/ }));
    await user.click(screen.getByRole('menuitem', { name: /Most recent/ }));

    const namesByRecency = orderedCardNames();
    expect(namesByRecency[0]).toContain('Inline dashboard');
    expect(namesByRecency[1]).toContain('SPC analysis');
    expect(namesByRecency[2]).toContain('Daily monitor');
  });

  it('pins an Artifact from its card, and the pinned state persists across a simulated reload', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    // No direction is sent: the pin endpoint is a toggle the backend resolves.
    await user.click(screen.getByRole('button', { name: 'Pin SPC analysis — Vt (gate CD)' }));

    expect(
      await screen.findByRole('button', { name: 'Unpin SPC analysis — Vt (gate CD)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pinned/ })).toHaveTextContent('2');

    // Reload: fresh QueryClient + fresh render, so the only way pinned state survives
    // is if the backend actually persisted it.
    renderGalleryPage();
    const pinnedFilters = await screen.findAllByRole('button', { name: /^Pinned/ });
    expect(pinnedFilters[pinnedFilters.length - 1]).toHaveTextContent('2');
    expect(
      screen.getAllByRole('button', { name: 'Unpin SPC analysis — Vt (gate CD)' }).length,
    ).toBeGreaterThan(0);
  });

  /** The direction has to be the caller's to state. With one toggling endpoint and the
   *  backend deciding, there was no way to say "unpin" — an Artifact could be pinned and
   *  then never released, which is exactly what happened. */
  it('pins an Artifact and releases it again', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    const name = 'SPC analysis — Vt (gate CD)';
    await screen.findByRole('button', { name });

    await user.click(screen.getByRole('button', { name: `Pin ${name}` }));
    expect(await screen.findByRole('button', { name: `Unpin ${name}` })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Unpin ${name}` }));
    expect(await screen.findByRole('button', { name: `Pin ${name}` })).toBeInTheDocument();
  });

  /** The backend owns the direction, so its answer is the only thing that knows which
   *  way the pin went. Reading it from the response rather than waiting for the list to
   *  come back again is what keeps the button honest when that refetch is slow — or, as
   *  here, never arrives at all. */
  it('flips the button from the toggle response, without waiting for the list to reload', async () => {
    const user = userEvent.setup();
    const name = 'SPC analysis — Vt (gate CD)';
    let listCalls = 0;
    server.use(
      http.get('/api/artifacts', () => {
        listCalls += 1;
        // Only the first read succeeds; everything after it fails, so nothing but the
        // toggle's own answer can move the button.
        return listCalls === 1
          ? HttpResponse.json([artifactDto({ id: 'artifact-1', title: name })])
          : new HttpResponse(null, { status: 500 });
      }),
      http.patch('/api/artifacts/:id/pin', () =>
        HttpResponse.json(
          artifactDto({ id: 'artifact-1', title: name, pinnedAt: '2026-09-01T00:00:00.000Z' }),
        ),
      ),
    );
    renderGalleryPage();
    await screen.findByRole('button', { name });

    await user.click(screen.getByRole('button', { name: `Pin ${name}` }));

    expect(await screen.findByRole('button', { name: `Unpin ${name}` })).toBeInTheDocument();
  });

  /** The card's Shared badge reads `isShared`, and sharing is what turns it on. The
   *  update endpoint answers with the new recipient list, so the flag is derived from
   *  that answer rather than refetched — this is what checks the derivation reaches the
   *  card. */
  it('turns the Shared badge on once the Artifact has recipients', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/artifacts/:id/shares', () => HttpResponse.json([])),
      http.patch('/api/artifacts/:id/shares', () =>
        HttpResponse.json([
          { type: 'ORG', orgId: 'INTD-1', orgName: '整合技術一課', orgLevel: 'SECTION' },
        ]),
      ),
    );
    renderGalleryPage();
    const name = 'SPC analysis — Vt (gate CD)';
    const card = () =>
      screen.getByRole('button', { name }).closest('[role="listitem"]') as HTMLElement;
    await screen.findByRole('button', { name });
    expect(card()).not.toHaveTextContent('Shared');

    await user.click(screen.getByRole('button', { name: `More actions for ${name}` }));
    await user.click(await screen.findByRole('menuitem', { name: 'Share' }));
    const field = await screen.findByRole('combobox');
    await user.click(field);
    await user.type(field, 'INTD-1');
    await user.click(await screen.findByTitle(/整合技術一課/, {}, { timeout: 3000 }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(card()).toHaveTextContent('Shared'));
  });

  /** The toggle's answer, merged into the cache, is the whole change — so nothing else
   *  should go over the wire. The rail's badge keeps the artifacts list mounted on every
   *  page, which made the follow-up invalidate this pins down cost one full list
   *  download per pin, from anywhere in the app. */
  it('pinning costs one PATCH and no list re-download', async () => {
    let listFetches = 0;
    server.use(
      // Counting tap: returning undefined falls through to the real handler.
      http.get('/api/artifacts', () => {
        listFetches += 1;
        return undefined;
      }),
    );
    const user = userEvent.setup();
    renderGalleryPage();
    const name = 'SPC analysis — Vt (gate CD)';
    await screen.findByRole('button', { name });
    const fetchesBeforePin = listFetches;

    await user.click(screen.getByRole('button', { name: `Pin ${name}` }));
    await screen.findByRole('button', { name: `Unpin ${name}` });

    expect(listFetches).toBe(fetchesBeforePin);
  });

  /** The pin endpoint answers with `artifactId`, not `id` — so the row to update is
   *  found by the id that was asked about. Matching on the answer's `id` found nothing at
   *  all, and the merge rewrote no row: the request succeeded and the button sat still. */
  it('updates the card from a response that names its subject artifactId', async () => {
    const user = userEvent.setup();
    const name = 'SPC analysis — Vt (gate CD)';
    server.use(
      http.get('/api/artifacts', () =>
        HttpResponse.json([artifactDto({ id: 'artifact-1', title: name })]),
      ),
      http.patch('/api/artifacts/:id/pin', () =>
        HttpResponse.json({
          artifactId: 'artifact-1',
          pinnedAt: '2026-09-02T00:00:00.000Z',
          owner: 'u-001',
          isOwn: true,
        }),
      ),
    );
    renderGalleryPage();
    await screen.findByRole('button', { name: `Pin ${name}` });

    await user.click(screen.getByRole('button', { name: `Pin ${name}` }));

    expect(await screen.findByRole('button', { name: `Unpin ${name}` })).toBeInTheDocument();
  });

  /** The toggle answers with the Artifact, but nothing says it answers with every field
   *  of it. Writing that answer over the cached row would drop whatever it left out —
   *  Merged, not replaced: a field the answer omits has to survive, or the row loses
   *  whatever the toggle did not happen to mention. */
  it('keeps the fields the toggle response leaves out, so the button stays usable', async () => {
    const user = userEvent.setup();
    const name = 'SPC analysis — Vt (gate CD)';
    let listCalls = 0;
    server.use(
      http.get('/api/artifacts', () => {
        listCalls += 1;
        // Only the first read succeeds, so the merged row is what the button reads —
        // exactly the case the merge exists for.
        return listCalls === 1
          ? HttpResponse.json([artifactDto({ id: 'artifact-1', title: name })])
          : new HttpResponse(null, { status: 500 });
      }),
      // A partial answer: the pin state and the id, and nothing else.
      http.patch('/api/artifacts/:id/pin', () =>
        HttpResponse.json({ id: 'artifact-1', pinnedAt: '2026-09-01T00:00:00.000Z' }),
      ),
    );
    renderGalleryPage();
    await screen.findByRole('button', { name: `Pin ${name}` });

    await user.click(screen.getByRole('button', { name: `Pin ${name}` }));

    const unpin = await screen.findByRole('button', { name: `Unpin ${name}` });
    expect(unpin).toBeEnabled();
  });

  it("shows Pin, Copy Link, Share, and Delete in an owned card's more-actions menu", async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    // Nothing is disabled up front: every action goes to the backend, and an endpoint
    // that has not landed answers with an error instead.
    for (const label of ['Pin', 'Copy link', 'Share', 'Delete']) {
      expect(screen.getByRole('menuitem', { name: label })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      );
    }
  });

  /** The menu says Delete because that is what it means to the user — the card goes.
   *  Underneath it unpublishes, which is why the Artifact survives in its conversation
   *  (see StudioPage.artifact-unpublish.test.tsx). */
  it('removes a card through the menu, and it leaves the Gallery', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    // The destructive step now sits behind a confirm — click through it.
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
      ).not.toBeInTheDocument(),
    );
  });

  /** Someone else's Artifact offers exactly one action: pin it, which is a private
   *  bookmark. Sharing it onward, or taking it off a shelf that is not yours, are the
   *  owner's to do — so they are not merely disabled here, they are absent. */
  it('offers only Pin on a "Shared to me" card', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'Daily monitor (A14)' });

    await user.click(screen.getByRole('button', { name: 'More actions for Daily monitor (A14)' }));

    const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual([expect.stringMatching(/^(Pin|Unpin)/)]);
  });

  /** Pinning is always available: it is this reader's own bookmark, not a permission the
   *  owner grants. A disabled pin was the contract asserting one anyway — and the field
   *  behind it went missing often enough to disable the button by accident. */
  it('never disables pinning, on an owned card or a shared one', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'Daily monitor (A14)' });

    expect(screen.getByRole('button', { name: /^Pin Daily monitor/ })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'More actions for Daily monitor (A14)' }));
    expect(screen.getByRole('menuitem', { name: /^Pin/ })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it("copies an Artifact's link to the clipboard from its card menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = writeText;
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Copy link' }));

    // The `#` is the whole point: the router is a hash router, so a link without it is
    // one that silently does not open when pasted anywhere outside the app. Asserted as
    // a literal rather than through `artifactHref`, which would agree with the
    // implementation by construction.
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/#/cowork/artifact/artifact-1'),
    );
  });

  it('names the producing session and badges sharing states', async () => {
    renderGalleryPage();

    const spcOpen = await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });
    const spcCard = spcOpen.closest('[role="listitem"]') as HTMLElement;
    const dailyCard = screen
      .getByRole('button', { name: 'Daily monitor (A14)' })
      .closest('[role="listitem"]') as HTMLElement;

    // Every card gets the same thumbnail: the contract has no kind until the backend
    // adds `type` (types/api/artifact.ts).
    expect(within(spcCard).getByTestId('artifact-thumbnail')).not.toHaveAttribute('data-kind');

    // Each card names the session that produced it — carried on the Artifact itself
    // now (`sessionTitle`), not looked up from the session list.
    expect(await within(spcCard).findByText('SPC — Vt (gate CD)')).toBeInTheDocument();
    expect(await within(dailyCard).findByText('Defect pareto — W12')).toBeInTheDocument();

    // Shared-to-me cards carry the thumbnail overlay badge; owned ones don't.
    expect(within(dailyCard).getByText('Shared to me')).toBeInTheDocument();
    expect(within(spcCard).queryByText('Shared to me')).not.toBeInTheDocument();
  });

  // The badge is asserted from seeded data rather than by sharing here: the recipient
  // directory is still a stub (ADR-0006), so a full share round-trip adds setup without
  // adding coverage — the badge only reads `isShared`.
  it('shows the primary "Shared" badge in the meta row for an Artifact already shared', async () => {
    server.use(
      http.get('/api/artifacts', () =>
        HttpResponse.json([
          artifactDto({ id: 'artifact-1', title: 'SPC analysis — Vt (gate CD)', isShared: true }),
        ]),
      ),
    );
    renderGalleryPage();

    const spcCard = (
      await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' })
    ).closest('[role="listitem"]') as HTMLElement;
    expect(within(spcCard).getByText('Shared')).toBeInTheDocument();
  });

  it('de-duplicates "Shared to me" by artifact id without collapsing distinct same-name artifacts', async () => {
    const shared = (over: Partial<Artifact> & Pick<Artifact, 'id' | 'title'>) =>
      // Someone else's Artifact: not own, so not shareable onward either.
      artifactDto({
        sessionId: 'session-2',
        sessionTitle: 'Defect pareto — W12',
        ownerDisplay: 'Alice Wu',
        isOwn: false,
        isShared: true,
        ...over,
      });
    server.use(
      http.get('/api/artifacts', () =>
        HttpResponse.json([
          // The same artifact shared to the user twice: one row survives.
          shared({ id: 'artifact-9', title: 'Daily monitor (A14)' }),
          shared({ id: 'artifact-9', title: 'Daily monitor (A14)' }),
          // Two different artifacts that happen to share a name: both stay.
          shared({ id: 'artifact-10', title: 'Q3 report', ownerDisplay: 'Bob Lin' }),
          shared({ id: 'artifact-11', title: 'Q3 report', ownerDisplay: 'Carol Kao' }),
        ]),
      ),
    );

    const user = userEvent.setup();
    renderGalleryPage();

    await user.click(await screen.findByRole('button', { name: /^Shared to me/ }));

    expect(screen.getAllByRole('button', { name: 'Daily monitor (A14)' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Q3 report' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /^Shared to me/ })).toHaveTextContent('3');
  });

  it('opens an Artifact in the full-page view when its card is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/cowork/artifacts']}>
        <Routes>
          <Route path="/cowork/artifacts" element={<ArtifactsGalleryPage />} />
          <Route path="/cowork/artifact/:artifactId" element={<ArtifactPage />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: appWrapper({ retry: true }) },
    );
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(screen.getByRole('button', { name: 'SPC analysis — Vt (gate CD)' }));

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
  });
});
