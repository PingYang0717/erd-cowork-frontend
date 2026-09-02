import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import type { Artifact } from '@/types/api';

import ShareArtifactDialog from './ShareArtifactDialog';

const artifact: Artifact = {
  id: 'artifact-1',
  version: 1,
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

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    onClose,
    ...render(<ShareArtifactDialog open onClose={onClose} artifact={artifact} />, { wrapper }),
  };
}

/** Waits for a click on an option to have registered as a choice.
 *
 *  Reads the chosen tags, not the Submit button: Submit is always pressable now, so its
 *  state says nothing about whether the click landed — which is exactly the confusion an
 *  earlier version of these tests fell into. */
async function selected(): Promise<string[]> {
  return waitFor(() => {
    const tags = Array.from(document.querySelectorAll('.ant-select-selection-item')).map(
      (node) => node.getAttribute('title') ?? '',
    );
    expect(tags.length).toBeGreaterThan(0);
    return tags;
  });
}

describe('Sharing an Artifact: picking recipients', () => {
  /** Submitting closes the dialog, so nothing is left to render the share list — asking
   *  for it again on the way out is a request for something nobody is about to look at.
   *  This holds even when the answer is not a list and the cache cannot be written from
   *  it: stale is enough, and the next open fetches. */
  it('does not re-read the share list on the way out', async () => {
    const user = userEvent.setup();
    let shareReads = 0;
    server.use(
      http.get('/api/artifacts/:id/shares', () => {
        shareReads += 1;
        return HttpResponse.json([]);
      }),
      // Not an array — the shape that cannot be written into the cache directly.
      http.patch('/api/artifacts/:id/shares', () => HttpResponse.json({ ok: true })),
    );
    const { onClose } = renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByTitle(/鄭凱宇/, {}, { timeout: 3000 }));
    await waitFor(() => expect(shareReads).toBeGreaterThan(0));
    const readsBeforeSubmit = shareReads;

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(shareReads).toBe(readsBeforeSubmit);
  });

  /** The param is named on the wire, so a rename on either side has to be caught here:
   *  a backend that does not recognise it does not fail — it answers as if nothing was
   *  asked, which reads as "no such person" rather than as a broken request. */
  it('sends the typed text as `keyword`', async () => {
    const user = userEvent.setup();
    let sent: URL | undefined;
    server.use(
      http.get('/api/hr/employeesAndOrgs', ({ request }) => {
        sent = new URL(request.url);
        return HttpResponse.json({ content: [] });
      }),
    );
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');

    await waitFor(() => expect(sent?.searchParams.get('keyword')).toBe('CHXXGHYC'));
  });

  /** The link is the Artifact's address, not something sharing produces — someone who
   *  opened this dialog only to copy it should not have to edit the recipient list first.
   *  It used to appear only after a successful share. */
  it('shows the link straight away, before anything has been shared', async () => {
    const user = userEvent.setup();
    renderDialog();

    const field = await screen.findByDisplayValue(/\/#\/cowork\/artifact\/artifact-1$/);
    expect(field).toBeInTheDocument();

    const writeText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = writeText;
    await user.click(screen.getByRole('button', { name: /複製/ }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/#/cowork/artifact/artifact-1'),
    );
  });

  /** The dialog maps over whatever the share list returns. A body that is not a list —
   *  an error rendered as JSON, a shape change — must read as "nobody yet" rather than
   *  taking the dialog down with it. */
  it('survives a share list that is not an array', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/artifacts/:id/shares', () => HttpResponse.json({ message: 'unexpected' })),
    );
    renderDialog();

    // Driven past the point the bad body arrives and is rendered: searching and choosing
    // both walk the list, so a dialog that survives this survived the body.
    const field = await screen.findByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByTitle(/鄭凱宇/, {}, { timeout: 3000 }));

    expect(await selected()).toContainEqual(expect.stringContaining('鄭凱宇'));
  });

  /** Submit is the only action here, and saving the list is the end of the dialog. */
  it('closes once the change has been saved', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    server.use(http.patch('/api/artifacts/:id/shares', () => HttpResponse.json({ shares: [] })));

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByTitle(/鄭凱宇/, {}, { timeout: 3000 }));
    expect(await selected()).toContainEqual(expect.stringContaining('鄭凱宇'));

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

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
      http.patch('/api/artifacts/:id/shares', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([]);
      }),
    );
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByTitle(/鄭凱宇/, {}, { timeout: 3000 }));
    // Submit only opens once something has actually been chosen; without this the click
    // below would land on a disabled button and the test would pass on nothing.
    expect(await selected()).toContainEqual(expect.stringContaining('鄭凱宇'));

    await user.click(screen.getByRole('button', { name: 'Submit' }));

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
      http.get('/api/artifacts/:id/shares', () =>
        HttpResponse.json([
          { type: 'ORG', orgId: 'INTD-1', orgName: '整合技術一課', orgLevel: 'SECTION' },
        ]),
      ),
      http.patch('/api/artifacts/:id/shares', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([]);
      }),
    );
    renderDialog();

    // Already there when the dialog opens — nothing was typed to find it, and it reads
    // with its name because the share list comes back in the picker's own shape.
    const chip = await screen.findByTitle('INTD-1 | 整合技術一課');
    expect(chip).toBeInTheDocument();

    // antd's own remove affordance on the tag; there is no accessible name on it to
    // query by, so the class is the only handle.
    const remove = chip
      .closest('.ant-select-selection-item')
      ?.querySelector('.ant-select-selection-item-remove');
    await user.click(remove as HTMLElement);
    // Removed, not merely clicked: the tag is gone before Submit is pressed.
    await waitFor(() =>
      expect(document.querySelectorAll('.ant-select-selection-item')).toHaveLength(0),
    );
    await user.click(screen.getByRole('button', { name: 'Submit' }));

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
    expect(await selected()).toContainEqual(expect.stringContaining('鄭凱宇'));

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
