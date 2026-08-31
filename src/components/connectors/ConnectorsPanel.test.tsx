import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';

import ConnectorsPanel from './ConnectorsPanel';

function renderPanel(sessionId = 'session-1') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <ConnectorsPanel sessionId={sessionId} open onClose={() => {}} />
      </Suspense>
    </QueryClientProvider>,
  );
}

function selectedSources() {
  return screen.getByRole('dialog').querySelector('[class*="selectedChips"]') as HTMLElement;
}

/** A data source is attached to a conversation, not to the user: the write goes to
 *  PATCH/DELETE /sessions/{id}/data-source, and what a fresh mount reads back is the
 *  session's detail. Two conversations can draw on different sources. */
describe('ConnectorsPanel', () => {
  it('attaches an available source to the session and reads it back on a fresh mount', async () => {
    const user = userEvent.setup();
    const first = renderPanel();

    // Lot Info seeds as available.
    await user.click(await screen.findByRole('button', { name: 'Connect Lot Info' }));
    expect(within(selectedSources()).getByText('Lot Info')).toBeInTheDocument();

    // A fresh tree with a fresh query cache reads the choice back from the session.
    first.unmount();
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Disconnect Lot Info' })).toBeInTheDocument();
    expect(within(selectedSources()).getByText('Lot Info')).toBeInTheDocument();
  });

  /** The point of moving attachment onto the session: what one conversation draws on
   *  says nothing about what another does. Under the old localStorage model this was
   *  impossible — a connect was global to the tab. */
  it('keeps each session\u2019s attachments separate', async () => {
    const user = userEvent.setup();
    const first = renderPanel('session-1');

    await user.click(await screen.findByRole('button', { name: 'Connect Lot Info' }));
    await screen.findByRole('button', { name: 'Disconnect Lot Info' });
    first.unmount();

    // session-2 was never given Lot Info, and must not have picked it up.
    renderPanel('session-2');
    expect(await screen.findByRole('button', { name: 'Connect Lot Info' })).toBeInTheDocument();
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
