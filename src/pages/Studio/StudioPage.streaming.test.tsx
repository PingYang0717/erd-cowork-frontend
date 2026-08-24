import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { StudioShell } from '@/features/studio/components/StudioShell';
import { useStudioLayoutStore } from '@/features/studio/store/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { answerAnalysisConditions } from '@/test/studioRun';

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
    await answerAnalysisConditions(user);
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

  it("collapses the agent's thinking behind a toggle, and keeps it out of the history", async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);
    expect(screen.queryByRole('button', { name: /thinking/i })).not.toBeInTheDocument();

    act(() => stream.push({ type: 'THINKING', delta: 'The Vt trend ' }));
    act(() => stream.push({ type: 'THINKING', delta: 'crosses the UCL on wafer 3.' }));

    const toggle = await screen.findByRole('button', { name: 'Thinking' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/crosses the UCL/)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByText('The Vt trend crosses the UCL on wafer 3.')).toBeInTheDocument();
  });

  it('renders a streamed reply as Markdown, and survives half-arrived syntax', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);

    // A list cut mid-syntax must not blow up the renderer.
    act(() => stream.push({ type: 'TOKEN', delta: '**Findings**\n\n- Vt drift on A14\n- Ids' }));
    expect(await screen.findByText('Findings')).toBeInTheDocument();

    act(() => stream.push({ type: 'TOKEN', delta: 'at stable\n' }));

    const thread = screen.getByRole('log', { name: 'Messages' });
    const findings = await within(thread).findByRole('list');
    expect(within(findings).getByText('Vt drift on A14')).toBeInTheDocument();
    expect(within(findings).getByText('Idsat stable')).toBeInTheDocument();
    expect(screen.getByText('Findings').tagName).toBe('STRONG');
  });

  it('renders the form the run asks for, holding submit back until required fields are filled', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);

    act(() =>
      stream.push({
        type: 'QUESTION',
        form: {
          formKey: 'spc-conditions',
          title: '分析條件',
          fields: [
            {
              key: 'partIds',
              label: 'Part ID',
              kind: 'multi',
              required: true,
              options: [
                { value: 'A14', label: 'A14' },
                { value: 'N5', label: 'N5' },
              ],
            },
          ],
          submitLabel: '送出',
          disabledHint: '請先選 part id',
          summaryLabel: '已設定 1 項 分析條件',
        },
      }),
    );

    expect(await screen.findByText('分析條件')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Part ID' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送出' })).toBeDisabled();
    expect(screen.getByText('請先選 part id')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'A14' }));

    expect(screen.getByRole('button', { name: '送出' })).toBeEnabled();
    expect(screen.queryByText('請先選 part id')).not.toBeInTheDocument();
  });

  it('shows a dependent field only for its trigger, and clears its answer when the trigger changes', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);

    act(() =>
      stream.push({
        type: 'QUESTION',
        form: {
          formKey: 'cptest-conditions',
          title: '分析條件',
          fields: [
            {
              key: 'role',
              label: '你的角色',
              kind: 'single',
              required: true,
              options: [
                { value: 'baseline', label: 'INT Baseline' },
                { value: 'loop', label: 'INT Loop' },
              ],
            },
            {
              key: 'flow',
              label: 'Flow',
              kind: 'single',
              required: false,
              visibleWhen: { field: 'role', equals: 'baseline' },
              options: [{ value: 'FEOL', label: 'FEOL' }],
            },
            {
              key: 'loop',
              label: 'Loop',
              kind: 'single',
              required: false,
              visibleWhen: { field: 'role', equals: 'loop' },
              options: [{ value: 'M1', label: 'M1' }],
            },
          ],
          submitLabel: '開始分析',
          disabledHint: '請先選角色',
          summaryLabel: '已設定 1 項 分析條件',
        },
      }),
    );

    await screen.findByRole('group', { name: '你的角色' });
    expect(screen.queryByRole('group', { name: 'Flow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Loop' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'INT Baseline' }));
    expect(screen.getByRole('group', { name: 'Flow' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Loop' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'FEOL' }));
    expect(screen.getByRole('button', { name: 'FEOL' })).toHaveAttribute('aria-pressed', 'true');

    // Switching the trigger swaps which dependent field is asked...
    await user.click(screen.getByRole('button', { name: 'INT Loop' }));
    expect(screen.queryByRole('group', { name: 'Flow' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Loop' })).toBeInTheDocument();

    // ...and the answer given under the old trigger is gone, not merely hidden.
    await user.click(screen.getByRole('button', { name: 'INT Baseline' }));
    expect(screen.getByRole('button', { name: 'FEOL' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sends the answers back structured rather than as prose', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudioPage();

    await startAnalysis(user);

    act(() =>
      stream.push({
        type: 'QUESTION',
        form: {
          formKey: 'spc-conditions',
          title: '分析條件',
          fields: [
            {
              key: 'partIds',
              label: 'Part ID',
              kind: 'multi',
              required: true,
              options: [
                { value: 'A14', label: 'A14' },
                { value: 'N5', label: 'N5' },
              ],
            },
            {
              key: 'timeRange',
              label: 'Time range',
              kind: 'single',
              required: true,
              options: [{ value: 'Last 7 days', label: 'Last 7 days' }],
            },
          ],
          submitLabel: '送出',
          disabledHint: '請先選 part id、time range',
          summaryLabel: '已設定 2 項 分析條件',
        },
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'A14' }));
    await user.click(screen.getByRole('button', { name: 'N5' }));
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    await user.click(screen.getByRole('button', { name: '送出' }));

    await waitFor(() => expect(stream.requests).toHaveLength(2));
    expect(stream.requests[1]).toEqual({
      answers: { partIds: ['A14', 'N5'], timeRange: 'Last 7 days' },
      inReplyTo: 'spc-conditions',
    });
  });

  // Runs against the scripted mock backend: this is about what the backend asks for,
  // not about holding a stream still.
  describe('the analysis conditions a Scenario asks for', () => {
    it('asks before running anything, with Data type drawn from the connected connectors', async () => {
      const user = userEvent.setup();
      renderStudioPage();

      await startAnalysis(user);

      expect(await screen.findByText('分析條件')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Part ID' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Time range' })).toBeInTheDocument();

      // Seeded connectors: Inline / WAT / CP are connected, the rest are not.
      const dataType = screen.getByRole('group', { name: 'Data type' });
      expect(within(dataType).getByRole('button', { name: 'Inline' })).toBeInTheDocument();
      expect(within(dataType).getByRole('button', { name: 'WAT' })).toBeInTheDocument();
      expect(within(dataType).queryByRole('button', { name: 'Defect' })).not.toBeInTheDocument();

      // Nothing has run yet — the agent is waiting on the user.
      expect(screen.queryByRole('button', { name: /^Worked through/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '送出' })).toBeDisabled();
      expect(screen.getByText('請先選 part id、time range、data type')).toBeInTheDocument();
    });
  });
});
