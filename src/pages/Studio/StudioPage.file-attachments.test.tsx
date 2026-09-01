import {
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { renderStudio, waitForComposer } from '@/test/renderStudio';

async function selectASessionAndOpenFileModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await waitForComposer();
  await user.click(screen.getByRole('button', { name: 'Attach files or connect a data source' }));
  await user.click(screen.getByRole('menuitem', { name: 'Attach files' }));
  return screen.findByRole('dialog', { name: 'Attach files' });
}

// The composer's own attachment chips render outside the (portal-rendered)
// modal, so scoping to this list disambiguates them from the modal's copy
// of the same chips without needing the modal to be closed first.
function composerAttachments() {
  return screen.getByRole('list', { name: 'Attached files' });
}

// Real bytes, not a faked size property: uploads now travel as multipart form
// data through the mock endpoint, which measures the actual part bytes.
function fileOfSize(name: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'text/csv' });
}

describe('File attachments', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  // A CSV here runs to gigabytes; without this the modal is a frozen screen for minutes.
  it('shows upload progress while the bytes are going out, and clears it when they land', async () => {
    const user = userEvent.setup();
    renderStudio();
    await selectASessionAndOpenFileModal(user);

    // Fired rather than awaited: the point is what the screen shows *during* the
    // upload, and userEvent's upload does not return until the request settles.
    fireEvent.change(screen.getByLabelText('Choose files'), {
      target: { files: [fileOfSize('big.csv', 4096)] },
    });

    expect(screen.getByRole('progressbar', { name: 'Uploading' })).toBeInTheDocument();

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar', { name: 'Uploading' }));
    expect(within(composerAttachments()).getByText(/big\.csv/)).toBeInTheDocument();
  });

  /** While bytes are going out, the surfaces that would start or undo an upload are shut.
   *  A CSV here runs to gigabytes, so the window is long enough to click in — and a
   *  second batch chosen mid-flight, or a file removed from under one, lands on a request
   *  that is already describing a different set. */
  it('closes the file surfaces while an upload is in flight, and opens them again after', async () => {
    const user = userEvent.setup();
    renderStudio();
    await selectASessionAndOpenFileModal(user);

    fireEvent.change(screen.getByLabelText('Choose files'), {
      target: { files: [fileOfSize('big.csv', 4096)] },
    });

    expect(screen.getByRole('progressbar', { name: 'Uploading' })).toBeInTheDocument();
    expect(screen.getByLabelText('Choose files')).toBeDisabled();
    expect(screen.getByRole('button', { name: /點擊選擇/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar', { name: 'Uploading' }));

    expect(screen.getByLabelText('Choose files')).toBeEnabled();
    expect(screen.getByRole('button', { name: /點擊選擇/ })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // The just-uploaded file can be removed again now that nothing is in flight.
    expect(
      within(screen.getByRole('dialog', { name: 'Attach files' })).getByRole('button', {
        name: /Remove/,
      }),
    ).toBeEnabled();
    void user;
  });

  /** Removing a file is a write to the same set the next question would be answered
   *  against. Until it lands, the composer is shut: a message sent in that window
   *  describes a set of files that is already changing under it. */
  it('shuts the composer while a file is being removed, and opens it again after', async () => {
    const user = userEvent.setup();
    let releaseDelete: (() => void) | undefined;
    server.use(
      http.delete('/api/sessions/:sessionId/files/:fileId', async () => {
        await new Promise<void>((resolve) => {
          releaseDelete = resolve;
        });
        return new HttpResponse(null, { status: 200 });
      }),
    );
    renderStudio();
    await selectASessionAndOpenFileModal(user);

    await user.upload(screen.getByLabelText('Choose files'), fileOfSize('lots.csv', 512));
    const dialog = screen.getByRole('dialog', { name: 'Attach files' });
    await within(dialog).findByText('lots.csv');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    const composer = screen.getByRole('textbox', { name: 'Message' });
    expect(composer).toBeEnabled();

    // The composer's own chip row, not the modal's copy of it (which is still mounted).
    await user.click(
      within(composerAttachments()).getByRole('button', { name: /^Remove lots\.csv/ }),
    );
    await waitFor(() => expect(composer).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();

    releaseDelete?.();
    await waitFor(() => expect(composer).toBeEnabled());
  });

  it('attaches a file via click-to-browse and shows it as a chip in the composer', async () => {
    const user = userEvent.setup();
    renderStudio();
    const dialog = await selectASessionAndOpenFileModal(user);

    // The dropzone speaks the mockup's Chinese copy.
    expect(within(dialog).getByText('點擊選擇')).toBeInTheDocument();
    expect(within(dialog).getByText('最多 5 個檔案 · 總計上限 5 GB')).toBeInTheDocument();

    const input = screen.getByLabelText('Choose files');
    await user.upload(input, fileOfSize('lot-genealogy.csv', 1024));

    expect(await within(dialog).findByText('lot-genealogy.csv')).toBeInTheDocument();
    expect(await within(composerAttachments()).findByText('lot-genealogy.csv')).toBeInTheDocument();
  });

  it('rejects unsupported file types with the Chinese error and an accept attribute on the input', async () => {
    // applyAccept off simulates a file arriving past the picker (drag & drop).
    const user = userEvent.setup({ applyAccept: false });
    renderStudio();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    expect(input).toHaveAttribute('accept', '.csv,.xlsx,.xls');

    await user.upload(input, fileOfSize('notes.pdf', 1024));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('僅支援 .csv / .xlsx');
    expect(within(dialog).queryByText('notes.pdf')).not.toBeInTheDocument();

    // Supported types still go through afterwards.
    await user.upload(input, fileOfSize('lots.xlsx', 1024));
    expect(await within(dialog).findByText('lots.xlsx')).toBeInTheDocument();
  });

  it('caps attachments at 5 files and warns when more are dropped at once', async () => {
    const user = userEvent.setup();
    renderStudio();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    const files = Array.from({ length: 6 }, (_, i) => fileOfSize(`file-${i}.csv`, 1024));
    await user.upload(input, files);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('最多 5 個檔案');
    expect(within(dialog).getAllByRole('button', { name: /^Remove file-/ })).toHaveLength(5);
    expect(within(dialog).queryByText('file-5.csv')).not.toBeInTheDocument();
  });

  // The 5 GB total-size rule lives in planFileAdditions and is covered by
  // utils/uploadValidation.test.ts — multi-GB File objects cannot ride a real
  // multipart body in tests.

  it('renders modal file rows with a type-colored icon, a type/size line, and a remove button', async () => {
    const user = userEvent.setup();
    renderStudio();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    await user.upload(input, [
      fileOfSize('lot-genealogy.csv', 1024),
      fileOfSize('yields.xlsx', 2048),
    ]);

    const csvRow = (await within(dialog).findByText('lot-genealogy.csv')).closest(
      'li',
    ) as HTMLElement;
    expect(within(csvRow).getByText('CSV · 1.0 KB')).toBeInTheDocument();
    expect(within(csvRow).getByTestId('file-type-icon')).toHaveAttribute('data-file-type', 'csv');
    expect(
      within(csvRow).getByRole('button', { name: 'Remove lot-genealogy.csv' }),
    ).toBeInTheDocument();

    const xlsxRow = within(dialog).getByText('yields.xlsx').closest('li') as HTMLElement;
    expect(within(xlsxRow).getByText('XLSX · 2.0 KB')).toBeInTheDocument();
    expect(within(xlsxRow).getByTestId('file-type-icon')).toHaveAttribute('data-file-type', 'xlsx');
  });

  /** Sending consumes the session's files. The message itself carries none — `Message`
   *  has no attachments on the wire — so what there is to observe is the composer's chip
   *  row emptying, which is how the user knows the files went with the question. */
  it('consumes the attached files on send, emptying the composer', async () => {
    const user = userEvent.setup();
    renderStudio();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    await user.upload(input, fileOfSize('lot-genealogy.csv', 1024));
    await within(dialog).findByText('lot-genealogy.csv');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Check this lot data');
    await user.keyboard('{Enter}');

    await screen.findByText('Check this lot data');
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: 'Attached files' })).not.toBeInTheDocument(),
    );
  });

  it('removes an attached file from the composer', async () => {
    const user = userEvent.setup();
    renderStudio();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    await user.upload(input, fileOfSize('lot-genealogy.csv', 1024));
    await within(dialog).findByText('lot-genealogy.csv');
    await within(composerAttachments()).findByText('lot-genealogy.csv');

    await user.click(
      within(composerAttachments()).getByRole('button', { name: 'Remove lot-genealogy.csv' }),
    );
    expect(screen.queryByRole('list', { name: 'Attached files' })).not.toBeInTheDocument();
  });
});
