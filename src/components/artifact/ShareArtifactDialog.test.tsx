import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
  canShare: true,
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

  /** A recipient already chosen must not turn back into a bare id when the next search
   *  replaces the options list under it. */
  it('keeps a chosen recipient labelled after the search moves on', async () => {
    const user = userEvent.setup();
    renderDialog();

    const field = screen.getByRole('combobox');
    await user.click(field);
    await user.type(field, 'CHXXGHYC');
    await user.click(await screen.findByText(/鄭凱宇/, {}, { timeout: 3000 }));

    await user.type(field, 'INTD-1');
    await waitFor(() => expect(screen.getByText(/鄭凱宇/)).toBeInTheDocument());
  });
});
