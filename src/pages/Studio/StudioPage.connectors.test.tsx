import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  /** Three states, from two facts: whether the connector can be chosen at all, and
   *  whether this conversation's draft has chosen it. `expired` and `no_access` used to
   *  be two of four here — the backend no longer distinguishes them, and neither did the
   *  reader's options. */
  it('exposes each connector state on its toggle button for the per-state styling', async () => {
    const user = userEvent.setup();
    renderStudio();
    await selectASessionAndOpenConnectors(user);

    // `selected`, not `connected`: this is what the panel is editing. Whether the
    // conversation is actually drawing on the source is the row's own `Attached` mark.
    expect(await screen.findByRole('button', { name: 'Disconnect Inline' })).toHaveAttribute('data-state', 'selected');
    expect(screen.getByRole('button', { name: 'Connect Lot Info' })).toHaveAttribute('data-state', 'available');
    expect(screen.getByRole('button', { name: 'Connect Recipe' })).toHaveAttribute('data-state', 'unavailable');
    expect(screen.getByRole('button', { name: 'Connect Offline Tool Log' })).toHaveAttribute(
      'data-state',
      'unavailable'
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
    expect(screen.getByRole('button', { name: 'Connect Offline Tool Log' })).toBeDisabled();
    // Shown, not hidden: a source that vanished from the list tells the reader nothing
    // about why they cannot pick it.
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  });

  // The selection belongs to this conversation and reaches the backend on Submit (see
  // ConnectorsPanel.test.tsx for the write itself); only a disabled source stays off.
  it('lets the user connect and disconnect; only a disabled source stays off', async () => {
    const user = userEvent.setup();
    renderStudio();
    await selectASessionAndOpenConnectors(user);

    expect(await screen.findByRole('button', { name: 'Connect Lot Info' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Disconnect Inline' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Connect Offline Tool Log' })).toBeDisabled();
  });
});
