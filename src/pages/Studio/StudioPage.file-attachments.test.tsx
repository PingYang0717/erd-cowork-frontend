import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { StudioShell } from '@/features/studio/components/StudioShell';
import { useStudioLayoutStore } from '@/features/studio/store/useStudioLayoutStore';

import { StudioPage } from './StudioPage';

const GB = 1024 * 1024 * 1024;

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
  await user.click(screen.getByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
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

function fileOfSize(name: string, sizeBytes: number): File {
  const file = new File([''], name, { type: 'text/csv' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
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

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Max 5 files');
    expect(within(dialog).getAllByRole('button', { name: /^Remove file-/ })).toHaveLength(5);
    expect(within(dialog).queryByText('file-5.csv')).not.toBeInTheDocument();
  });

  it('rejects a file that would push the total over 5 GB', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    await user.upload(input, fileOfSize('big-1.csv', 4 * GB));
    await within(dialog).findByText('big-1.csv');

    await user.upload(input, fileOfSize('big-2.csv', 2 * GB));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Total size limit is 5 GB');
    expect(within(dialog).queryByText('big-2.csv')).not.toBeInTheDocument();
    expect(within(dialog).getByText('big-1.csv')).toBeInTheDocument();
  });

  it('sends attachments with the message and clears the composer', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    const dialog = await selectASessionAndOpenFileModal(user);

    const input = screen.getByLabelText('Choose files');
    await user.upload(input, fileOfSize('lot-genealogy.csv', 1024));
    await within(dialog).findByText('lot-genealogy.csv');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Check this lot data');
    await user.keyboard('{Enter}');

    const sent = await screen.findByRole('list', { name: 'Message attachments' });
    expect(within(sent).getByText('lot-genealogy.csv')).toBeInTheDocument();
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
