import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { answerAnalysisConditions } from '@/test/studioRun';

import { StudioPage } from './StudioPage';

// StudioPage is only the /cowork index route's content now; the session
// rail lives in StudioShell, the route's shared parent (router.tsx). This
// mirrors that nesting so the rendered tree matches production.
function renderStudioPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectASessionAndRunSpcScenario(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  // The composer subtree suspends on its queries; wait for it before sync getBy*.
  await screen.findByRole('textbox', { name: 'Message' });

  await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
  await answerAnalysisConditions(user);
  await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
}

describe('Artifact panel', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('renders the produced Artifact HTML in a sandboxed iframe once a scenario completes', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASessionAndRunSpcScenario(user);

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
  });

  // The sandbox stops the artifact reaching into this app; the policy stops it reaching
  // out. Both are needed — see utils/artifactCsp.
  it('locks the artifact down with a content-security policy before it loads anything', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASessionAndRunSpcScenario(user);

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    const srcdoc = iframe.getAttribute('srcdoc') ?? '';

    expect(srcdoc).toContain("default-src 'none'");
    expect(srcdoc).toContain("connect-src 'none'");
    expect(srcdoc.indexOf('Content-Security-Policy')).toBeLessThan(srcdoc.indexOf('<title>'));
  });
});
