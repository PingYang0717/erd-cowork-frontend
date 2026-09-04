import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { en } from '@/i18n/en';
import { server } from '@/mocks/server';
import { appWrapper } from '@/test/appHarness';
import { artifactFixture } from '@/test/artifactFixture';
import ShareArtifactDialog from './ShareArtifactDialog';

const artifact = artifactFixture();

const renderDialog = (onClose = vi.fn()) => {
  return {
    onClose,
    ...render(<ShareArtifactDialog open onClose={onClose} artifact={artifact} />, {
      wrapper: appWrapper(),
    }),
  };
};

/** Waits for a click on an option to have registered as a choice.
 *
 *  Reads the chosen tags, not the Submit button: Submit is always pressable now, so its
 *  state says nothing about whether the click landed — which is exactly the confusion an
 *  earlier version of these tests fell into. */
const selected = async (): Promise<string[]> => {
  return waitFor(() => {
    const tags = Array.from(document.querySelectorAll('.ant-select-selection-item')).map(
      (node) => node.getAttribute('title') ?? ''
    );
    expect(tags.length).toBeGreaterThan(0);
    return tags;
  });
};

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
      http.patch('/api/artifacts/:id/shares', () => HttpResponse.json({ ok: true }))
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
      })
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
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/#/cowork/artifact/artifact-1'));
  });

  /** A body that is not a list — an error rendered as JSON, a shape change — must not
   *  take the dialog down. It must not read as "nobody yet" either: that is a different
   *  fact, and the one the user would act on. */
  it('says so when the share list comes back in a shape it cannot read', async () => {
    server.use(http.get('/api/artifacts/:id/shares', () => HttpResponse.json({ message: 'unexpected' })));
    renderDialog();

    expect(await screen.findByText(en.share.unavailable)).toBeInTheDocument();
    // Still standing, and still offering the way out every dialog needs.
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  /** The list failing to load and the list being empty are different facts, and the
   *  Gallery card may be showing a Shared badge from the same data. Reading one as the
   *  other tells the user an Artifact is private when it may be shared org-wide. */
  it('says so when the share list cannot be fetched, and will not let it be edited', async () => {
    server.use(http.get('/api/artifacts/:id/shares', () => new HttpResponse(null, { status: 500 })));
    renderDialog();

    expect(await screen.findByText(en.share.unavailable)).toBeInTheDocument();
    // Editing a list nobody can see would be building a delta on a baseline that is not
    // real; the picker is closed rather than the dialog.
    expect(screen.getByRole('combobox')).toBeDisabled();
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

    expect(await screen.findByText('Type at least 3 characters')).toBeInTheDocument();
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
      })
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

    await waitFor(() => expect(body).toEqual({ add: [{ type: 'EMPLOYEE', id: 'CHXXGHYC' }], remove: [] }));
  });

  /** Sharing is an edit to a list that already exists, so the dialog opens on it — and
   *  taking someone off travels as `remove`, not as a shorter `add`. */
  it('opens on the current recipients, and removing one sends it under remove', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get('/api/artifacts/:id/shares', () =>
        HttpResponse.json([{ type: 'ORG', orgId: 'INTD-1', orgName: '整合技術一課', orgLevel: 'SECTION' }])
      ),
      http.patch('/api/artifacts/:id/shares', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([]);
      })
    );
    renderDialog();

    // Already there when the dialog opens — nothing was typed to find it, and it reads
    // with its name because the share list comes back in the picker's own shape.
    const chip = await screen.findByTitle('INTD-1 | 整合技術一課');
    expect(chip).toBeInTheDocument();

    // antd's own remove affordance on the tag; there is no accessible name on it to
    // query by, so the class is the only handle.
    const remove = chip.closest('.ant-select-selection-item')?.querySelector('.ant-select-selection-item-remove');
    await user.click(remove as HTMLElement);
    // Removed, not merely clicked: the tag is gone before Submit is pressed.
    await waitFor(() => expect(document.querySelectorAll('.ant-select-selection-item')).toHaveLength(0));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(body).toEqual({ add: [], remove: [{ type: 'SECTION', id: 'INTD-1' }] }));
  });

  /** A body whose `content` is missing used to reach a `for…of` and throw "entries is
   *  not iterable" over the whole dialog. It must not do that — and it must not come out
   *  as "no match" either, which sends the user off to re-check a spelling that was
   *  never the problem. */
  it('says the search failed when the response has no content array', async () => {
    const user = userEvent.setup();
    server.use(
      // `content` present but not a list. Chosen over an envelope with no `content` at
      // all: that one comes back as `undefined`, which the query layer rejects on its
      // own, so it would pass whether or not this client checked the shape. This is the
      // body that reaches the picker's `for…of` when nothing checks.
      http.get('/api/hr/employeesAndOrgs', () => HttpResponse.json({ content: { message: 'unexpected' } }))
    );
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');

    expect(await screen.findByText(en.share.searchFailed, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('says the search failed when the directory cannot be reached', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/hr/employeesAndOrgs', () => new HttpResponse(null, { status: 500 })));
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');

    expect(await screen.findByText(en.share.searchFailed, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  /** The tick and the wording are the only confirmation a copy gets, so they have to be
   *  earned. `writeText` rejects whenever the page is not a secure context. */
  it('does not claim the link was copied when the clipboard refused', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/artifacts/:id/shares', () => HttpResponse.json([])));
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    renderDialog();

    await user.click(await screen.findByRole('button', { name: /Copy/ }));

    expect(screen.getByRole('button', { name: /Copy/ })).toHaveTextContent('Copy');
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
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
      const chosen = Array.from(document.querySelectorAll('.ant-select-selection-item')).map((node) =>
        node.getAttribute('title')
      );
      expect(chosen).toContain('INTD-1 | CHXXGHYC | 鄭凱宇');
    });
  });
});
