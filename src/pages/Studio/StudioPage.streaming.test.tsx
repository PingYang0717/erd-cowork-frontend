import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { StudioShell } from '@/features/studio/components/StudioShell';
import { useStudioLayoutStore } from '@/features/studio/store/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';

import { StudioPage } from './StudioPage';

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

async function startAnalysis(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
}

describe('Streaming a run in the Studio', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('reveals each step only when the stream reports it, not on a timer', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);

    expect(await screen.findByRole('status', { name: 'eRD AI is working' })).toBeInTheDocument();
    expect(screen.queryByText('Connect data source')).not.toBeInTheDocument();

    act(() =>
      stream.push({
        type: 'STEP',
        stepKey: 'connect',
        title: 'Connect data source',
        description: 'Inline DB · Vt (gate CD)',
        status: 'RUNNING',
      }),
    );

    expect(await screen.findByText('Connect data source')).toBeInTheDocument();
    expect(screen.getByText('Inline DB · Vt (gate CD)')).toBeInTheDocument();
  });
});
