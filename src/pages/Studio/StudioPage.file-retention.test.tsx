import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio } from '@/test/renderStudio';

/** The backend deletes a session's files once they go untouched for the retention
 *  period. The row survives, flagged expired, and nothing the agent does can succeed
 *  until the user clears it. */
function sessionWithAnExpiredFile() {
  server.use(
    http.get('/api/sessions/:sessionId', ({ params }) =>
      HttpResponse.json({
        id: params.sessionId,
        title: 'SPC — Vt (gate CD)',
        createdAt: '2026-08-01T00:00:00.000Z',
        messages: [],
        files: [
          {
            id: 'file-old',
            name: 'lot-genealogy.csv',
            alias: 't1',
            sizeBytes: 2048,
            type: 'text/csv',
            rowCount: null,
            expired: true,
          },
        ],
      }),
    ),
  );
}

describe('File retention', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('marks an expired file rather than quietly dropping it', async () => {
    sessionWithAnExpiredFile();
    renderStudio();

    const chips = await screen.findByRole('list', { name: 'Attached files' });
    expect(within(chips).getByText(/lot-genealogy\.csv/)).toBeInTheDocument();
    expect(within(chips).getByText('已過期')).toBeInTheDocument();
  });

  it('says how long files are kept, and why this one is gone', async () => {
    sessionWithAnExpiredFile();
    renderStudio();

    const notice = await screen.findByRole('alert');
    expect(notice).toHaveTextContent(/30 天/);
    expect(notice).toHaveTextContent(/移除/);
  });

  it('blocks sending until the expired file is cleared', async () => {
    sessionWithAnExpiredFile();
    renderStudio();

    await screen.findByRole('alert');
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'SPC analysis' })).toBeDisabled();
  });

  it('says nothing when every file is still there', async () => {
    renderStudio();

    await screen.findByRole('textbox', { name: 'Message' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeEnabled();
  });
});
