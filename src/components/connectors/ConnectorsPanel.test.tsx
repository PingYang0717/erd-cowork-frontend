import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';

import ConnectorsPanel from './ConnectorsPanel';

function renderPanel() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <ConnectorsPanel open onClose={() => {}} />
      </Suspense>
    </QueryClientProvider>,
  );
}

function selectedSources() {
  return screen.getByRole('dialog').querySelector('[class*="selectedChips"]') as HTMLElement;
}

/** Connector choices are the user's preference, kept in localStorage — the backend has
 *  no connector endpoints this round, and a preference should not be lost to a reload. */
describe('ConnectorsPanel', () => {
  it('connects an available source and remembers it across a fresh mount', async () => {
    const user = userEvent.setup();
    const first = renderPanel();

    // Lot Info seeds as available.
    await user.click(await screen.findByRole('button', { name: 'Connect Lot Info' }));
    expect(within(selectedSources()).getByText('Lot Info')).toBeInTheDocument();

    // A fresh tree with a fresh query cache reads the choice back from localStorage.
    first.unmount();
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Disconnect Lot Info' })).toBeInTheDocument();
    expect(within(selectedSources()).getByText('Lot Info')).toBeInTheDocument();
  });

  it('disconnects a connected source', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Disconnect WAT' }));
    expect(await screen.findByRole('button', { name: 'Connect WAT' })).toBeInTheDocument();
    expect(within(selectedSources()).queryByText('WAT')).not.toBeInTheDocument();
  });

  it('adds a custom source, connected, and it survives a fresh mount', async () => {
    const user = userEvent.setup();
    const first = renderPanel();

    await screen.findByRole('button', { name: 'Connect Lot Info' });
    await user.type(
      screen.getByRole('textbox', { name: 'Add a custom data source' }),
      'My Team DB',
    );
    await user.click(screen.getByRole('button', { name: /Add/ }));

    expect(
      await screen.findByRole('button', { name: 'Disconnect My Team DB' }),
    ).toBeInTheDocument();

    first.unmount();
    renderPanel();
    expect(
      await screen.findByRole('button', { name: 'Disconnect My Team DB' }),
    ).toBeInTheDocument();
  });
});
