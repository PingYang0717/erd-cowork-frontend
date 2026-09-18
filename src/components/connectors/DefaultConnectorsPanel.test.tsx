import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import { server } from '@/mocks/server';
import { appWrapper } from '@/test/appHarness';
import DefaultConnectorsPanel from './DefaultConnectorsPanel';

const renderPanel = () => render(<DefaultConnectorsPanel open onClose={() => {}} />, { wrapper: appWrapper() });

const selectedSources = () => screen.getByRole('dialog').querySelector('[class*="selectedChips"]') as HTMLElement;

/** The user's default sources (CONTEXT.md, 預設 Connectors): what a new conversation opens
 *  the Connectors panel on. The same picker a conversation uses, but Save writes the
 *  preference and touches no session. */
describe('DefaultConnectorsPanel', () => {
  beforeEach(() => localStorage.removeItem(CONNECTOR_PREFS_STORAGE_KEY));

  it('opens on the saved defaults and saves the new combination', async () => {
    const user = userEvent.setup();
    localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ defaultConnectors: ['inline'] }));
    renderPanel();

    expect(await screen.findByRole('button', { name: 'Disconnect Inline' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(/Never attached to a conversation/);
    // Nothing is attached to anything here: the mark is a conversation's.
    expect(within(screen.getByRole('dialog')).queryByText('Attached')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Connect Lot Info' }));
    await user.click(screen.getByRole('button', { name: 'Disconnect Inline' }));
    expect(within(selectedSources()).getByText('Lot Info')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(JSON.parse(localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY)!)).toEqual({ defaultConnectors: ['lot'] });
  });

  /** A default the catalogue no longer serves is not shown; one it serves but can no
   *  longer be chosen stays, so it can be let go of. The unknown one is not stuck in the
   *  preference either: its absence counts as a change, and Save writes the list without it. */
  it('drops defaults the catalogue does not know and keeps the ones it cannot offer', async () => {
    const user = userEvent.setup();
    localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ defaultConnectors: ['gone', 'recipe'] }));
    renderPanel();

    // Recipe is served but disabled in the mock catalogue.
    expect(await screen.findByRole('button', { name: 'Disconnect Recipe' })).toBeInTheDocument();
    expect(within(selectedSources()).queryByText('gone')).toBeNull();

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(JSON.parse(localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY)!)).toEqual({ defaultConnectors: ['recipe'] });
  });

  /** Opened from the header, which has no boundary of its own: a catalogue that cannot
   *  be read says so inside the dialog. */
  it('says so inside the dialog when the catalogue cannot be read', async () => {
    server.use(
      http.get('/api/connectors', () => HttpResponse.json({ code: 'INTERNAL', message: 'x' }, { status: 500 }))
    );
    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
