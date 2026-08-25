import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';

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

async function openConnectorsPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Attach files or connect a data source' }));
  await user.click(screen.getByRole('menuitem', { name: 'Connectors' }));
}

async function selectASessionAndOpenConnectors(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await openConnectorsPanel(user);
}

describe('Connectors panel', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('exposes each connector state on its toggle button for the per-state styling', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASessionAndOpenConnectors(user);

    expect(await screen.findByRole('button', { name: 'Disconnect Inline' })).toHaveAttribute(
      'data-state',
      'connected',
    );
    expect(screen.getByRole('button', { name: 'Connect Lot Info' })).toHaveAttribute(
      'data-state',
      'available',
    );
    expect(screen.getByRole('button', { name: 'Connect Recipe' })).toHaveAttribute(
      'data-state',
      'expired',
    );
    expect(screen.getByRole('button', { name: 'Connect Offline Tool Log' })).toHaveAttribute(
      'data-state',
      'no_access',
    );
  });

  it('lists every connector type with its current status', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASessionAndOpenConnectors(user);

    expect(await screen.findByRole('dialog', { name: 'Connectors' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Disconnect Inline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect WAT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect CP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Lot Info' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Lot Abnormal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Process' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Defect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect TEM' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Recipe' })).toBeInTheDocument();
    expect(screen.getByText('Token expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Offline Tool Log' })).toBeDisabled();
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  it('connects a connector from the panel, and the status persists across a simulated reload', async () => {
    const user = userEvent.setup();
    const { unmount } = renderStudioPage();
    await selectASessionAndOpenConnectors(user);

    const connectButton = await screen.findByRole('button', { name: 'Connect Lot Info' });
    await user.click(connectButton);

    expect(await screen.findByRole('button', { name: 'Disconnect Lot Info' })).toBeInTheDocument();

    // Reload: unmount, then a fresh QueryClient + fresh render, so the only
    // way the new status survives is if the mock backend (localStorage-backed)
    // actually persisted it. Session selection (Zustand) is a module
    // singleton unaffected by unmount, so the same session is still selected
    // and the composer is available immediately.
    unmount();
    renderStudioPage();
    const reloadedUser = userEvent.setup();
    await screen.findByRole('textbox', { name: 'Message' });
    await openConnectorsPanel(reloadedUser);
    expect(await screen.findByRole('button', { name: 'Disconnect Lot Info' })).toBeInTheDocument();
  });

  it('disconnects a connected connector from the panel', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await selectASessionAndOpenConnectors(user);

    const disconnectButton = await screen.findByRole('button', { name: 'Disconnect Inline' });
    await user.click(disconnectButton);

    expect(await screen.findByRole('button', { name: 'Connect Inline' })).toBeInTheDocument();
  });
});
