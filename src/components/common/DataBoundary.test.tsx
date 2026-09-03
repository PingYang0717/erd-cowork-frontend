import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { useSessions } from '@/hooks/useSessions';
import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import { appWrapper } from '@/test/appHarness';

import DataBoundary from './DataBoundary';

const Probe: React.FC = () => {
  const { data } = useSessions();
  return <div>loaded {data.length}</div>;
};

describe('DataBoundary + a failed suspense query', () => {
  /** The regression this guards: without QueryErrorResetBoundary, a remount alone
   *  re-threw the CACHED query error — the card flashed straight back and Retry
   *  recovered nothing, ever. The reset is what makes the button real. */
  it('Retry actually refetches: recovers once the backend answers again', async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get('/api/sessions', () =>
        failing ? new HttpResponse(null, { status: 500 }) : HttpResponse.json([]),
      ),
    );

    render(
      <DataBoundary label="Sessions">
        <Probe />
      </DataBoundary>,
      { wrapper: appWrapper() },
    );

    expect(await screen.findByText(en.errors.loadFailedHeading)).toBeInTheDocument();

    failing = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('loaded 0')).toBeInTheDocument();
  });

  /** And the other half: a Retry pressed while the backend is still down lands back on
   *  the card (with a real request behind it), not on a blank pane. */
  it('stays on the error card when Retry fails again', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/sessions', () => new HttpResponse(null, { status: 500 })));

    render(
      <DataBoundary label="Sessions">
        <Probe />
      </DataBoundary>,
      { wrapper: appWrapper() },
    );

    expect(await screen.findByText(en.errors.loadFailedHeading)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText(en.errors.loadFailedHeading)).toBeInTheDocument();
    expect(screen.queryByText(/loaded/)).not.toBeInTheDocument();
  });
});
