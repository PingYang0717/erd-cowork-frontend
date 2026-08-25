import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';

import { StudioPage } from './StudioPage';

// StudioPage is only the /cowork index route's content now; the session
// rail lives in StudioShell, the route's shared parent (router.tsx). This
// mirrors that nesting so the rendered tree matches production.
function renderStudioPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectASessionAndOpenFileModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  // The composer subtree suspends on its queries; wait for it before sync getBy*.
  await screen.findByRole('textbox', { name: 'Message' });
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

  it('attaches a file via click-to-browse and shows it as a chip in the composer', async () => {
    const user = userEvent.setup();
    renderStudioPage();
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
    renderStudioPage();
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
    renderStudioPage();
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
    renderStudioPage();
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

  it('sends attachments with the message, rendering the chips inside the bubble above the text', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    await user.upload(input, fileOfSize('lot-genealogy.csv', 1024));
    await within(dialog).findByText('lot-genealogy.csv');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Check this lot data');
    await user.keyboard('{Enter}');

    // The chips live inside the blue user bubble, before the message text.
    const bubbleText = await screen.findByText('Check this lot data');
    const bubble = bubbleText.parentElement as HTMLElement;
    const sent = within(bubble).getByRole('list', { name: 'Message attachments' });
    expect(within(sent).getByText('lot-genealogy.csv')).toBeInTheDocument();
    expect(
      sent.compareDocumentPosition(bubbleText) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Attached files' })).not.toBeInTheDocument();
  });

  it('removes an attached file from the composer', async () => {
    const user = userEvent.setup();
    renderStudioPage();
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
