import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
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

async function selectASession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
}

async function startAnalysis(user: ReturnType<typeof userEvent.setup>) {
  await selectASession(user);
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

  it('shows the reply building up token by token while the run is still going', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);
    const working = await screen.findByRole('status', { name: 'eRD AI is working' });

    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed control limits. ' }));
    expect(await screen.findByText(/Recomputed control limits\./)).toBeInTheDocument();

    act(() => stream.push({ type: 'TOKEN', delta: 'One OOC point remains.' }));

    expect(
      await screen.findByText('Recomputed control limits. One OOC point remains.'),
    ).toBeInTheDocument();
    expect(working).toBeInTheDocument();
  });

  it('swaps send for stop while a run is going, and keeps what was produced', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await selectASession(user);
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed control limits.' }));
    await screen.findByText('Recomputed control limits.');

    const stop = await screen.findByRole('button', { name: 'Stop' });
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();

    await user.click(stop);

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'eRD AI is working' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Recomputed control limits.')).toBeInTheDocument();
    expect(screen.getByText('eRD AI · stopped')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('tells the user the connection dropped, and offers the composer back', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed control limits.' }));
    await screen.findByText('Recomputed control limits.');

    act(() => stream.disconnect());

    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost — send it again.');
    expect(screen.queryByRole('status', { name: 'eRD AI is working' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  // Runs against the scripted mock backend rather than a hand-driven stream: this is a
  // post-run assertion, so there is no intermediate state to hold still.
  it('reports how long the finished run took', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await startAnalysis(user);
    await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });

    expect(screen.getByText(/^Took \d+(\.\d+)?s$/)).toBeInTheDocument();
  });

  it('shows the artifact in the right pane the moment the run reports it', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);
    expect(screen.queryByTitle('Artifact preview')).not.toBeInTheDocument();

    act(() =>
      stream.push({
        type: 'ARTIFACT',
        artifactId: 'artifact-1',
        title: 'SPC analysis — Vt (gate CD)',
      }),
    );

    expect(await screen.findByTitle('Artifact preview')).toBeInTheDocument();
  });
});
