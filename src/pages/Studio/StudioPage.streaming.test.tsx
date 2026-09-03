import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useConnectorsPanelStore } from '@/stores/useConnectorsPanelStore';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { mockAgentStream } from '@/test/agentStream';
import { renderStudio, waitForComposer } from '@/test/renderStudio';
import { answerAnalysisConditions } from '@/test/studioRun';

const selectASession = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'New chat' }));
  await screen.findByRole('button', { name: 'New analysis' });
  await waitForComposer();
};

const startAnalysis = async (user: ReturnType<typeof userEvent.setup>) => {
  await selectASession(user);
  await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
};

describe('Streaming a run in the Studio', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('reveals each step only when the stream reports it, not on a timer', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

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

  /** Who is speaking and what they are doing are two different statements. The label
   *  names the speaker and reads the same throughout; that the run is in progress belongs
   *  inside the step panel, beside the steps it is producing. */
  it('says it is working from inside the step panel, not from the speaker label', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();
    await startAnalysis(user);

    const panel = await screen.findByRole('status', { name: 'eRD AI is working' });
    expect(within(panel).getByText(/is working/)).toBeInTheDocument();
    // Additions announce individually; the whole panel is not re-read per step (A-3).
    expect(panel).toHaveAttribute('aria-atomic', 'false');
    // The thread itself is silenced — the streaming bubble lives inside it, and
    // role="log"'s implicit polite live region re-read every token (A-1).
    expect(screen.getByRole('log', { name: 'Messages' })).toHaveAttribute('aria-live', 'off');

    // The label above stays the speaker's name while the run is going.
    expect(screen.getByText('eRD AI')).toBeInTheDocument();

    act(() => stream.push({ type: 'TOKEN', delta: 'Done.' }));
    act(() => stream.push({ type: 'ANSWER', text: 'Done.' }));
    act(() => stream.close());

    // And the panel's claim goes with the panel when the run ends.
    await waitFor(() => expect(screen.queryByText(/is working/)).not.toBeInTheDocument());
    // The finished reply is announced once, from the dedicated region — the only
    // live channel left now that the log is off (A-1).
    expect(screen.getByRole('status', { name: 'Latest reply' })).toHaveTextContent('Done.');
  });

  it('shows the reply building up token by token while the run is still going', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

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

  it('shows the question as a user bubble immediately, before the run finishes', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await selectASession(user);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Check the Vt drift');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    // The stream is still open — nothing persisted, nothing refetched — yet the
    // user's own words are already on screen.
    expect(await screen.findByText('Check the Vt drift')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'eRD AI is working' })).toBeInTheDocument();

    act(() => stream.close());
  });

  it('iterates on the artifact on display: the next send carries baseArtifactId', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await startAnalysis(user);
    act(() =>
      stream.push({
        type: 'ARTIFACT',
        artifactId: 'artifact-9',
        title: 'SPC analysis — Vt (gate CD)',
      }),
    );
    act(() => stream.close());
    // The composer re-enables once the run (and its awaited refetch) is done.
    await screen.findByRole('button', { name: 'Send message' });

    // The panel now displays artifact-9; a follow-up question builds on it.
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Make the limits tighter');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(stream.requests).toHaveLength(2));
    expect(stream.requests[1]).toEqual({
      question: 'Make the limits tighter',
      baseArtifactId: 'artifact-9',
    });
  });

  it('swaps send for stop while a run is going, and keeps what was produced', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

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
    // Scoped to the thread: the sr-only announcement region (A-1) holds the same text.
    expect(
      within(screen.getByRole('log', { name: 'Messages' })).getByText('Recomputed control limits.'),
    ).toBeInTheDocument();
    expect(screen.getByText('eRD AI · stopped')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('tells the user the connection dropped, and offers the composer back', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await startAnalysis(user);
    act(() => stream.push({ type: 'TOKEN', delta: 'Recomputed control limits.' }));
    await screen.findByText('Recomputed control limits.');

    act(() => stream.disconnect());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Connection lost — please send again',
    );
    expect(screen.queryByRole('status', { name: 'eRD AI is working' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    // The user's own words survive the failure: the history refetch never ran, so
    // clearing the optimistic bubble here erased what they typed — the message the
    // error is asking them to send again.
    expect(screen.getByText('Run an SPC analysis on Vt (gate CD).')).toBeInTheDocument();
  });

  it('collapses the artifact HTML being written behind a toggle, and keeps it out of the history', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await startAnalysis(user);
    expect(screen.queryByRole('button', { name: /HTML/ })).not.toBeInTheDocument();

    act(() => stream.push({ type: 'CODE', delta: '<div id="chart"' }));
    act(() => stream.push({ type: 'CODE', delta: '></div>' }));

    // The label says the source is still being written (cowork's wording).
    const toggle = await screen.findByRole('button', { name: 'HTML being written' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByText('<div id="chart"></div>')).toBeInTheDocument();
  });

  it('shows the query results the run produced along the way', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await startAnalysis(user);

    act(() =>
      stream.push({
        type: 'TABLE',
        tableId: 't1',
        intent: 'OOC wafers on A14',
        columns: ['Lot', 'Wafer', 'Vt'],
        rows: [
          ['A14-001', 3, 0.361],
          ['A14-004', 11, null],
        ],
        truncated: true,
      }),
    );

    const table = await screen.findByRole('table', { name: 'OOC wafers on A14' });
    expect(within(table).getByRole('columnheader', { name: 'Wafer' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'A14-001' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '0.361' })).toBeInTheDocument();
    // A null cell renders empty rather than as the word "null".
    expect(within(table).queryByRole('cell', { name: 'null' })).not.toBeInTheDocument();
    expect(screen.getByText('(results truncated)')).toBeInTheDocument();
  });

  // Runs against the scripted mock backend rather than a hand-driven stream: this is a
  // post-run assertion, so there is no intermediate state to hold still.
  // The elapsed time belongs to the turn that spent it, so it rides that turn's bubble
  // rather than sitting at the bottom of the thread where scrolling up leaves it behind.
  it('reports how long the finished run took, on the bubble that took it', async () => {
    const user = userEvent.setup();
    renderStudio();

    await startAnalysis(user);
    await answerAnalysisConditions(user);
    const recap = await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });

    const bubble = recap.closest('div[class*="aiBubble"]') as HTMLElement;
    expect(within(bubble).getByText(/^\d+(\.\d+)?s$/)).toBeInTheDocument();
  });

  it('shows the artifact in the right pane the moment the run reports it', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

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
    renderStudio();

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
    renderStudio();

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
    renderStudio();

    await startAnalysis(user);

    act(() =>
      stream.push({
        type: 'QUESTION',
        questions: [],
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
    renderStudio();

    await startAnalysis(user);

    act(() =>
      stream.push({
        type: 'QUESTION',
        questions: [],
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

  it('sends the answers back composed as a prose question (backend body is question-only)', async () => {
    const user = userEvent.setup();
    const stream = mockAgentStream();
    renderStudio();

    await startAnalysis(user);

    act(() =>
      stream.push({
        type: 'QUESTION',
        questions: [],
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

    // The backend closes the stream after a reask — the run pauses on the user.
    act(() => stream.close());
    await screen.findByRole('button', { name: 'Send message' });

    await user.click(await screen.findByRole('button', { name: 'A14' }));
    await user.click(screen.getByRole('button', { name: 'N5' }));
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    await user.click(screen.getByRole('button', { name: '送出' }));

    await waitFor(() => expect(stream.requests).toHaveLength(2));
    expect(stream.requests[1]).toEqual({
      question: 'Part ID：A14、N5；Time range：Last 7 days',
    });
  });

  // Runs against the scripted mock backend: this is about what the backend asks for,
  // not about holding a stream still.
  describe('the analysis conditions a Scenario asks for', () => {
    it('asks before running anything, and never blocks on an unconnected connector', async () => {
      const user = userEvent.setup();
      renderStudio();

      await startAnalysis(user);

      expect(await screen.findByText('分析條件')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Part ID' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Time range' })).toBeInTheDocument();

      // A connector is a capability the user MAY grant the agent, not a precondition for
      // talking to it: a fresh conversation has none attached, and the form still offers
      // something to pick so the run is never blocked on a choice the user did not make.
      const dataType = screen.getByRole('group', { name: 'Data type' });
      expect(within(dataType).getAllByRole('button').length).toBeGreaterThan(0);
      expect(within(dataType).queryByRole('button', { name: 'Defect' })).not.toBeInTheDocument();

      // Nothing has run yet — the agent is waiting on the user.
      expect(screen.queryByRole('button', { name: /^Worked through/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '送出' })).toBeDisabled();
      expect(screen.getByText('請先選 part id、time range、data type')).toBeInTheDocument();
    });

    /** The principle a connector rests on: it is a capability the user may grant the
     *  agent — one more way for it to go and fetch data — not something that has to be
     *  chosen before the agent will talk. A conversation with nothing connected must run
     *  to completion, and this drives it all the way to a finished artifact to say so. */
    it('runs an analysis to completion with no connector attached at all', async () => {
      const user = userEvent.setup();
      renderStudio();

      await startAnalysis(user);
      await screen.findByText('分析條件');
      await answerAnalysisConditions(user);

      await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
      // Scoped to the thread: the sr-only announcement region (A-1) holds the same text.
      expect(
        within(screen.getByRole('log', { name: 'Messages' })).getByText(
          /Done — recomputed control limits/,
        ),
      ).toBeInTheDocument();
    });

    /** The convenience the localStorage preference exists for: the same person grants
     *  roughly the same capabilities every time, so having chosen once, a new conversation
     *  opens on that combination rather than making them choose it again. Carried in on
     *  send, which is when the session comes into being (ADR-0005). */
    it('carries the combination the user last chose into the next conversation', async () => {
      const user = userEvent.setup();
      renderStudio();

      // First conversation: grant Defect on top of what is there.
      await selectASession(user);
      await user.click(
        screen.getByRole('button', { name: 'Attach files or connect a data source' }),
      );
      await user.click(await screen.findByRole('menuitem', { name: /^Connectors/ }));
      await user.click(await screen.findByRole('button', { name: 'Connect Defect' }));
      // Nothing is written until Submit: picking sources is one decision, not one per
      // click.
      // Nothing is written until Submit: picking sources is one decision, not one per
      // click. The panel closes only after every write has landed, so its own open flag
      // is the signal that the session now has them — the dialog element itself is no
      // use here, since antd leaves it in the DOM and merely hides it.
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => expect(useConnectorsPanelStore.getState().isOpen).toBe(false));

      // Make the first conversation real: New chat is a no-op while a draft is still
      // open (useSessionGroups), so it has to have been sent to before a second one can
      // be started.
      await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Anything at all.{Enter}');
      await waitFor(
        () => expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument(),
        { timeout: 5000 },
      );

      // A second, entirely fresh conversation — nothing attached to it of its own.
      const firstSessionId = useSessionSelectionStore.getState().selectedSessionId;
      await user.click(screen.getByRole('button', { name: 'New chat' }));
      await waitFor(() =>
        expect(useSessionSelectionStore.getState().selectedSessionId).not.toBe(firstSessionId),
      );
      await waitForComposer();
      await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
      await screen.findByText('分析條件');

      const dataType = screen.getByRole('group', { name: 'Data type' });
      expect(within(dataType).getByRole('button', { name: 'Defect' })).toBeInTheDocument();
    });

    /** The link between the two surfaces, asserted from the user's side rather than from
     *  a fixture: connect a source in the panel, and the next run must offer it. These
     *  used to read from different places — the question was built from a stale fixture
     *  of its own — so a source the user had just connected never showed up, and the
     *  test that "covered" this asserted the absent one was absent. */
    it('offers a source the user just connected as a Data type option', async () => {
      const user = userEvent.setup();
      renderStudio();

      await selectASession(user);
      await user.click(
        screen.getByRole('button', { name: 'Attach files or connect a data source' }),
      );
      await user.click(await screen.findByRole('menuitem', { name: /^Connectors/ }));
      await user.click(await screen.findByRole('button', { name: 'Connect Defect' }));
      // Nothing is written until Submit: picking sources is one decision, not one per
      // click.
      // Nothing is written until Submit: picking sources is one decision, not one per
      // click. The panel closes only after every write has landed, so its own open flag
      // is the signal that the session now has them — the dialog element itself is no
      // use here, since antd leaves it in the DOM and merely hides it.
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => expect(useConnectorsPanelStore.getState().isOpen).toBe(false));

      await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
      await screen.findByText('分析條件');

      const dataType = screen.getByRole('group', { name: 'Data type' });
      expect(within(dataType).getByRole('button', { name: 'Defect' })).toBeInTheDocument();
    });

    it('offers a way back to the connectors from the Data type field', async () => {
      const user = userEvent.setup();
      renderStudio();

      await startAnalysis(user);
      await screen.findByText('分析條件');

      expect(screen.getByText('可多選,只顯示已連線的來源。')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Manage connections' }));

      expect(await screen.findByRole('dialog', { name: 'Connectors' })).toBeInTheDocument();
    });

    it('lets the user type a Time range the chips do not offer', async () => {
      const user = userEvent.setup();
      renderStudio();

      await startAnalysis(user);
      await screen.findByText('分析條件');

      const custom = screen.getByRole('textbox', { name: 'Time range' });
      await user.type(custom, '07/01–07/31');

      // Typing a custom range answers the field, so the chips let go of their choice.
      const chips = screen.getByRole('group', { name: 'Time range' });
      expect(within(chips).getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );

      await user.click(
        within(screen.getByRole('group', { name: 'Part ID' })).getByRole('button', { name: 'A14' }),
      );
      await user.click(
        within(screen.getByRole('group', { name: 'Data type' })).getByRole('button', {
          name: 'Inline',
        }),
      );
      expect(screen.getByRole('button', { name: '送出' })).toBeEnabled();
    });

    it('narrows a long option list with a search box', async () => {
      const user = userEvent.setup();
      renderStudio();

      await startAnalysis(user);
      await screen.findByText('分析條件');

      const partIds = screen.getByRole('group', { name: 'Part ID' });
      expect(within(partIds).getByRole('button', { name: 'N5' })).toBeInTheDocument();

      await user.type(screen.getByRole('textbox', { name: 'Search Part ID' }), 'A14');

      // Filtering is debounced, so the narrowed list arrives a beat after the keystrokes.
      await waitFor(() =>
        expect(within(partIds).queryByRole('button', { name: 'N5' })).not.toBeInTheDocument(),
      );
      expect(within(partIds).getByRole('button', { name: 'A14' })).toBeInTheDocument();
    });

    it('asks CP Test for its own conditions, swapping the field that depends on the role', async () => {
      const user = userEvent.setup();
      renderStudio();

      await selectASession(user);
      await user.click(screen.getByRole('button', { name: 'CP Test status' }));

      await screen.findByText('分析條件');
      expect(screen.getByRole('group', { name: '你的角色' })).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Flow' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '開始分析' })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'INT Baseline' }));
      expect(screen.getByRole('group', { name: 'Flow' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '其他' }));
      expect(screen.queryByRole('group', { name: 'Flow' })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '自行輸入範圍' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'INT Loop' }));
      expect(screen.getByRole('group', { name: 'Loop' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'M1' }));

      await user.click(screen.getByRole('button', { name: '近 7 天' }));

      const mineOnly = screen.getByRole('button', { name: '只看我送測的 (王小明)' });
      expect(mineOnly).toHaveAttribute('aria-pressed', 'false');
      await user.click(mineOnly);
      expect(mineOnly).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: '開始分析' }));

      await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
      // Scoped to the thread: the sr-only announcement region (A-1) holds the same text.
      expect(
        within(screen.getByRole('log', { name: 'Messages' })).getByText(
          /CP Test status dashboard is ready/,
        ),
      ).toBeInTheDocument();
    });

    it('sends a true boolean as its option label in the prose answer, and lets it be switched back off', async () => {
      const user = userEvent.setup();
      const stream = mockAgentStream();
      renderStudio();

      await selectASession(user);
      await user.click(screen.getByRole('button', { name: 'CP Test status' }));

      act(() =>
        stream.push({
          type: 'QUESTION',
          questions: [],
          form: {
            formKey: 'cptest-conditions',
            title: '分析條件',
            fields: [
              {
                key: 'mineOnly',
                label: '檢視',
                kind: 'boolean',
                required: false,
                options: [{ value: 'mineOnly', label: '只看我送測的 (王小明)' }],
              },
            ],
            submitLabel: '開始分析',
            disabledHint: '',
            summaryLabel: '分析條件',
          },
        }),
      );

      // The backend closes the stream after a reask — the run pauses on the user.
      act(() => stream.close());
      await screen.findByRole('button', { name: 'Send message' });

      const mineOnly = await screen.findByRole('button', { name: '只看我送測的 (王小明)' });
      await user.click(mineOnly);
      expect(mineOnly).toHaveAttribute('aria-pressed', 'true');

      // Clicking it again switches it off rather than re-selecting it.
      await user.click(mineOnly);
      expect(mineOnly).toHaveAttribute('aria-pressed', 'false');

      await user.click(mineOnly);
      await user.click(screen.getByRole('button', { name: '開始分析' }));

      await waitFor(() => expect(stream.requests).toHaveLength(2));
      expect(stream.requests[1]).toEqual({
        question: '檢視：只看我送測的 (王小明)',
      });
    });

    it('stops mid-run to ask which DC items to chart first', async () => {
      const user = userEvent.setup();
      renderStudio();

      await startAnalysis(user);

      // Answer only the opening conditions — the second reask is what this is about.
      await screen.findByText('分析條件');
      await user.click(
        within(screen.getByRole('group', { name: 'Part ID' })).getByRole('button', { name: 'A14' }),
      );
      await user.click(
        within(screen.getByRole('group', { name: 'Time range' })).getByRole('button', {
          name: 'Last 7 days',
        }),
      );
      await user.click(
        within(screen.getByRole('group', { name: 'Data type' })).getByRole('button', {
          name: 'Inline',
        }),
      );
      await user.click(screen.getByRole('button', { name: '送出' }));

      // The scan step ran, found too much, and handed back to the user.
      expect(await screen.findByText(/要先看哪些 DC Item/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Worked through/ })).not.toBeInTheDocument();

      const submit = screen.getByRole('button', { name: '先產生這 0 項' });
      expect(submit).toBeDisabled();
      expect(screen.getByText('至少選一項')).toBeInTheDocument();

      // Each item carries the spec limits an engineer needs to judge it.
      const items = screen.getByRole('group', { name: 'DC item' });
      expect(within(items).getByRole('button', { name: /Vt \(gate CD\)/ })).toHaveAccessibleName(
        /0\.28 – 0\.34 V/,
      );

      await user.type(screen.getByRole('textbox', { name: 'Search DC item' }), 'Vt');
      await waitFor(() =>
        expect(within(items).queryByRole('button', { name: /Idsat/ })).not.toBeInTheDocument(),
      );

      await user.click(within(items).getByRole('button', { name: /Vt \(gate CD\)/ }));
      expect(screen.getByRole('button', { name: '先產生這 1 項' })).toBeEnabled();
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '先產生這 1 項' }));

      await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });
      // Scoped to the thread: the sr-only announcement region (A-1) holds the same text.
      expect(
        within(screen.getByRole('log', { name: 'Messages' })).getByText(
          /Done — recomputed control limits/,
        ),
      ).toBeInTheDocument();
    });

    it('leaves the answered conditions in the thread as a prose user message', async () => {
      const user = userEvent.setup();
      renderStudio();

      await startAnalysis(user);
      await answerAnalysisConditions(user);
      await screen.findByRole('button', { name: /^Worked through \d+ steps$/ });

      // The form is gone; the answers went over the wire as one prose question and
      // come back from history as an ordinary user message.
      expect(screen.queryByRole('button', { name: '送出' })).not.toBeInTheDocument();
      expect(
        screen.getByText('Part ID：A14；Time range：Last 7 days；Data type：Inline'),
      ).toBeInTheDocument();
    });
  });
});
