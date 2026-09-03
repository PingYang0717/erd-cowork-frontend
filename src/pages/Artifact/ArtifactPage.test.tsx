import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import StudioShell from '@/components/layouts/StudioShell';
import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import ArtifactsGalleryPage from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import StudioPage from '@/pages/Studio/StudioPage';
import { appWrapper } from '@/test/appHarness';
import { artifactHref } from '@/utils/artifactUrl';

import ArtifactPage from './ArtifactPage';

const renderArtifactPageAt = (path: string) => {
  // Retries would hide the "not found" case behind exponential backoff, so
  // this suite's requests resolve/reject immediately.
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cowork" element={<StudioShell />}>
          <Route index element={<StudioPage />} />
          <Route path="artifacts" element={<ArtifactsGalleryPage />} />
        </Route>
        <Route path="/cowork/artifact/:artifactId" element={<ArtifactPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: appWrapper() },
  );
};

describe('Artifact full-page view', () => {
  /** The version switcher reads the producing session, which may be gone — deleting a
   *  session does not delete the Artifacts it produced, and their cards stay in the
   *  Gallery. The switcher is an extra; the Artifact is the point, so its absence must
   *  not take the page down with it. */
  it('still renders the Artifact when its producing session has been deleted', async () => {
    server.use(http.get('/api/sessions/:sessionId', () => new HttpResponse(null, { status: 404 })));
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
    // The switcher is unaffected: it reads the Artifact it was handed, not the session
    // that produced it. It used to fetch the session, so a deleted one removed the menu
    // from a page whose Artifact was perfectly fetchable.
    expect(await screen.findByRole('button', { name: 'Switch Artifact' })).toBeInTheDocument();
    expect(screen.queryByText(/failed to load/)).not.toBeInTheDocument();
  });

  it('renders the correct seeded Artifact when navigated to directly, with no prior session context', async () => {
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
  });

  /** Only a 404 means gone. A 500 says nothing about whether the Artifact exists, and
   *  a reader told it was deleted stops looking for something that is still there. */
  it('says the load failed, not that the Artifact is gone, when the server errors', async () => {
    server.use(http.get('/api/artifacts/:id', () => new HttpResponse(null, { status: 500 })));
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    expect(await screen.findByText(en.artifact.loadFailed)).toBeInTheDocument();
    expect(screen.queryByText(en.studio.artifactNotFound)).not.toBeInTheDocument();
  });

  it('shows a not-found message when the Artifact id does not exist', async () => {
    renderArtifactPageAt('/cowork/artifact/does-not-exist');

    expect(await screen.findByText('Artifact not found.')).toBeInTheDocument();
    expect(screen.queryByTitle('Artifact preview')).not.toBeInTheDocument();
  });

  it('shows Back and returns to the gallery when opened from a gallery card', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifacts');

    await user.click(await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' }));
    await screen.findByTitle('Artifact preview');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
  });

  it('shows Home and returns to the Studio when opened directly (a shared link)', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
  });

  it('lists the session-derived versions in the toolbar version menu', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');

    // Only this Artifact. Its siblings from the same conversation are not its versions
    // (artifact-model-decisions Q1) — the Studio panel lists those, because there the
    // conversation is the context; here the reader arrived at one Artifact from the
    // Gallery. Real versions (Q6) are not built yet.
    await user.click(await screen.findByRole('button', { name: 'Switch Artifact' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items).toHaveLength(1);

    // Named for what it lists. It used to carry the Studio panel's heading — "N Artifacts
    // from this conversation" — on a page with no conversation and nothing to switch to.
    expect(screen.getByText(en.artifact.ownVersionsTitle)).toBeInTheDocument();

    // No `vN` here. That number counts outputs within the session; under a heading about
    // this Artifact's versions it would be read as "version N of this Artifact", which is
    // a different thing and not one that exists yet (artifact-model-decisions Q2/Q6).
    expect(within(items[0]).queryByText(/^v\d+$/)).not.toBeInTheDocument();
    expect(items[0]).toHaveTextContent('SPC analysis — Vt (gate CD)');
    expect(items[0]).toHaveAttribute('aria-current', 'true');
  });

  it('shows the Shared to me header instead of the version menu for an Artifact shared by someone else', async () => {
    renderArtifactPageAt('/cowork/artifact/artifact-3');

    await screen.findByTitle('Artifact preview');

    const header = screen.getByLabelText('Shared to me');
    expect(within(header).getByText('Alice Wu')).toBeInTheDocument();
    expect(within(header).getByText('Shared to me')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch Artifact' })).not.toBeInTheDocument();
    // A personal copy cannot be shared onward — sharing is the owner's act
    // (CONTEXT.md). The button stays visible so the rule is seen, not discovered.
    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeDisabled();
  });

  it('offers Share, Reload, and Open-in-new-tab in the toolbar', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');

    // Share is live: clicking opens the recipient dialog (the submit surfaces the
    // backend's own answer, ready or not).
    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeEnabled();

    // A Reload must REMOUNT the document, not merely refetch the same HTML — the
    // string never changes, so React would leave a wedged iframe exactly where it
    // was. A fresh element is the observable proof the document restarted (ADR-0001).
    const frameBefore = screen.getByTitle('Artifact preview');
    await user.click(screen.getByRole('button', { name: 'Reload artifact' }));
    const frameAfter = await screen.findByTitle('Artifact preview');
    expect(frameAfter).not.toBe(frameBefore);

    const openInNewTab = screen.getByRole('button', { name: 'Open artifact in new tab' });
    await user.hover(openInNewTab);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Open preview in a new tab');
    await user.unhover(openInNewTab);

    await user.click(openInNewTab);
    // Absolute, and carrying the `#` — window.open bypasses the router, so a bare path
    // here would be a link that silently fails to open (ADR-0011).
    expect(openSpy).toHaveBeenCalledWith(
      artifactHref('artifact-1'),
      '_blank',
      'noopener,noreferrer',
    );
    expect(artifactHref('artifact-1')).toContain('/#/');

    openSpy.mockRestore();
  });

  /** A shared-link recipient can land here with the backend down, facing an error card
   *  in a language they may not read. The card carries the settings entry (ErrorPanel),
   *  so the language exit survives the very failure that hid every other entry. */
  it('keeps a Settings entry on the failure card when the artifacts list cannot load', async () => {
    server.use(http.get('/api/artifacts', () => new HttpResponse(null, { status: 500 })));
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    expect(await screen.findByText(en.errors.loadFailedHeading)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });
});
