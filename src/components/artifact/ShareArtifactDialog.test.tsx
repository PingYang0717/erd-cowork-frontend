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

  /** The change travels as a delta of what to add and what to remove, each recipient
   *  named by kind and id rather than by the row it was picked from. Which kind and which
   *  id is the mapping's business, pinned per case in `directoryEntry.test.ts`. */
  it('sends the change as add/remove, each recipient as its kind and id', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.patch('/api/artifacts/:id/share', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ shares: [] });
      }),
    );
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByTitle(/鄭凱宇/, {}, { timeout: 3000 }));
    // Submit only opens once something has actually been chosen; without this the click
    // below would land on a disabled button and the test would pass on nothing.
    await waitFor(() => expect(screen.getByRole('button', { name: '分享' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: '分享' }));

    await waitFor(() =>
      expect(body).toEqual({ add: [{ type: 'EMPLOYEE', id: 'CHXXGHYC' }], remove: [] }),
    );
  });

  /** Sharing is an edit to a list that already exists, so the dialog opens on it — and
   *  taking someone off travels as `remove`, not as a shorter `add`. */
  it('opens on the current recipients, and removing one sends it under remove', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get('/api/artifacts/:id/share', () =>
        HttpResponse.json({ shares: [{ type: 'SECTION', id: 'INTD-1', name: '整合技術一課' }] }),
      ),
      http.patch('/api/artifacts/:id/share', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ shares: [] });
      }),
    );
    renderDialog();

    // Already there when the dialog opens — nothing was typed to find it.
    const chip = await screen.findByTitle('INTD-1 | 整合技術一課');
    expect(chip).toBeInTheDocument();

    // antd's own remove affordance on the tag; there is no accessible name on it to
    // query by, so the class is the only handle.
    const remove = chip
      .closest('.ant-select-selection-item')
      ?.querySelector('.ant-select-selection-item-remove');
    await user.click(remove as HTMLElement);
    await waitFor(() => expect(screen.getByRole('button', { name: '分享' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '分享' }));

    await waitFor(() =>
      expect(body).toEqual({ add: [], remove: [{ type: 'SECTION', id: 'INTD-1' }] }),
    );
  });

  /** The picker walks the response with `for…of`. A body whose `content` is missing —
   *  an error rendered as JSON, a shape change — used to reach that loop and throw
   *  "entries is not iterable" over the whole dialog. */
  it('survives a search response with no content array', async () => {
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
