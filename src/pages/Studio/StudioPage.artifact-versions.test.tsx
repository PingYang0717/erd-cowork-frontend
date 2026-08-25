import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';

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

describe('Artifact version switcher', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('lists a seeded Artifact’s versions and re-renders the iframe with the selected version’s HTML', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).not.toContain('Draft');

    await user.click(screen.getByRole('button', { name: '切換版本' }));
    expect(screen.getByRole('menuitem', { name: /draft/i })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /draft/i }));

    const updatedIframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(screen.getByRole('button', { name: '切換版本' })).toHaveTextContent(/draft/i);
    expect(updatedIframe.getAttribute('srcdoc')).toContain('Draft');
  });

  it('shows the custom menu: header row, current-version highlight, per-row time, and generated checks', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    // Regenerate so the menu holds mixed generated states (v1/v2 generated, v3 not).
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await screen.findByRole('button', { name: '生成 Artifact' });

    await user.click(screen.getByRole('button', { name: '切換版本' }));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('版本 · 共 3 個，可切換後再生成')).toBeInTheDocument();

    const current = within(menu).getByRole('menuitem', { name: /v3/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(within(menu).getByRole('menuitem', { name: /v2/ })).not.toHaveAttribute(
      'aria-current',
      'true',
    );

    // Generated versions carry the green check; the fresh v3 does not.
    const v2Row = within(menu).getByRole('menuitem', { name: /v2/ });
    expect(within(v2Row).getByLabelText('已生成')).toBeInTheDocument();
    expect(within(current).queryByLabelText('已生成')).not.toBeInTheDocument();

    // Seeded v2's timestamp (2026-08-20) renders in its row; the relative
    // format shows a weekday within a week of "now", the date beyond that.
    expect(within(v2Row).getByText(/^(Thu|Aug 20)$/)).toBeInTheDocument();
  });

  it('renders content of its own for a regenerated version', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('· v2');

    await user.click(screen.getByRole('button', { name: 'Regenerate artifact' }));

    await expect
      .poll(() =>
        (screen.getByTitle('Artifact preview') as HTMLIFrameElement).getAttribute('srcdoc'),
      )
      .toContain('· v3');
  });
});
