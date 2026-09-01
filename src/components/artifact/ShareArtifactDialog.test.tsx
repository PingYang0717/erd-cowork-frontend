import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import type { Artifact } from '@/types/api/index';

import ShareArtifactDialog from './ShareArtifactDialog';

const artifact: Artifact = {
  id: 'artifact-1',
  sessionId: 'session-1',
  sessionTitle: 'SPC — Vt (gate CD)',
  title: 'SPC analysis — Vt (gate CD)',
  createdAt: '2026-08-20T09:15:00.000Z',
  pinnedAt: null,
  publishedAt: '2026-08-20T09:20:00.000Z',
  owner: 'user-1',
  ownerDisplay: 'You',
  canPin: true,
  isOwn: true,
  isShared: false,
  hasPersonalCopy: false,
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<ShareArtifactDialog open onClose={vi.fn()} artifact={artifact} />, { wrapper });
}

describe('Sharing an Artifact: picking recipients', () => {
  /** The directory is the whole organisation. A one- or two-character key matches most
   *  of it, so the field says what it needs rather than sending a request that would be
   *  large, slow, and unreadable. */
  it('does not search until the key is long enough', async () => {
    const user = userEvent.setup();
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CH');

    expect(await screen.findByText('請至少輸入 3 個字元')).toBeInTheDocument();
  });

  it('searches the backend once the key is long enough, and offers what it matched', async () => {
    const user = userEvent.setup();
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');

    expect(await screen.findByText(/鄭凱宇/, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  /** That the dialog sends recipients in the shape the endpoint wants — kind and id,
   *  not the row it was picked from. Which kind and which id is the mapping's business
   *  and is pinned per case in `directoryEntry.test.ts`; this is the wiring. */
  it('sends the recipient as its kind and id, not as the row it was picked from', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.post('/api/artifacts/:id/share', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ url: 'https://example.test/a', artifact });
      }),
    );
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByTitle(/鄭凱宇/, {}, { timeout: 3000 }));
    // The picker reports the choice by enabling submit; without that the click landed on
    // a text node rather than on the option.
    await waitFor(() => expect(screen.getByRole('button', { name: '分享' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: '分享' }));

    await waitFor(() => expect(body).toEqual({ targets: [{ type: 'EMPLOYEE', id: 'CHXXGHYC' }] }));
  });

  /** The picker walks the response with `for…of`. A body that is not a list — an
   *  envelope, an error rendered as JSON — used to reach that loop and throw "entries is
   *  not iterable" over the whole dialog. */
  it('survives a search response that is not a list', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/hr/employeesAndOrgs', () => HttpResponse.json({ message: 'unexpected' })),
    );
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');

    expect(await screen.findByText('找不到符合的對象', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  /** A recipient already chosen must not turn back into a bare id when the next search
   *  replaces the options list under it. */
  it('keeps a chosen recipient labelled after the search moves on', async () => {
    const user = userEvent.setup();
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByTitle(/鄭凱宇/, {}, { timeout: 3000 }));
    // Selected, not merely rendered: the label has to survive because it is a choice,
    // and a click that never landed would leave nothing to survive.
    await waitFor(() => expect(screen.getByRole('button', { name: '分享' })).toBeEnabled());

    await user.click(field);
    await user.type(field, 'INTD-1');

    // Scoped to the chosen tags rather than the whole dialog: this search also matches
    // the same person (their org is INTD-1), so a document-wide text query would find the
    // option list and pass without the tag having survived at all.
    await waitFor(() => {
      const chosen = Array.from(document.querySelectorAll('.ant-select-selection-item')).map(
        (node) => node.getAttribute('title'),
      );
      expect(chosen).toContain('INTD-1 | CHXXGHYC | 鄭凱宇');
    });
  });
});
