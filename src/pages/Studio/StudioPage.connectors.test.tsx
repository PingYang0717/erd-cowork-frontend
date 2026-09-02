import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

const openConnectorsPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Attach files or connect a data source' }));
  await user.click(screen.getByRole('menuitem', { name: 'Connectors' }));
};

// A session the backend already knows about, not a draft: connector state is what
// these cases are about, and a draft would not survive the simulated reload below
// (ADR-0005).
const selectASessionAndOpenConnectors = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'Defect pareto — W12' }));
  await waitForComposer();
  await openConnectorsPanel(user);
};

describe('Connectors panel', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('exposes each connector state on its toggle button for the per-state styling', async () => {
    const user = userEvent.setup();
    renderStudio();
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
    renderStudio();
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

  // Choices are the user's preference, kept in localStorage (see
  // ConnectorsPanel.test.tsx for the persistence itself); only no_access stays off.
  it('lets the user connect and disconnect; only no_access stays off', async () => {
    const user = userEvent.setup();
    renderStudio();
    await selectASessionAndOpenConnectors(user);

    expect(await screen.findByRole('button', { name: 'Connect Lot Info' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Disconnect Inline' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Add$/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Connect Offline Tool Log' })).toBeDisabled();
  });
});
