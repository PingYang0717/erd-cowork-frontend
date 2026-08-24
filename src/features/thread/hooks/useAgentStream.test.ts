import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockAgentStream, mockAgentStreamRejection } from '@/test/agentStream';

import { useAgentStream } from './useAgentStream';

describe('useAgentStream', () => {
  it('accumulates TOKEN deltas into the live reply text while streaming', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });

    stream.push({ type: 'TOKEN', delta: 'Vt ' });
    stream.push({ type: 'TOKEN', delta: 'is drifting on A14.' });

    await waitFor(() => {
      expect(result.current.state.liveText).toBe('Vt is drifting on A14.');
    });
  });

  it('is streaming from send() until the stream closes', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    expect(result.current.state.isStreaming).toBe(false);

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });
    await waitFor(() => expect(result.current.state.isStreaming).toBe(true));

    stream.push({ type: 'ANSWER', text: 'Done.' });
    expect(result.current.state.isStreaming).toBe(true);

    act(() => stream.close());

    await waitFor(() => expect(result.current.state.isStreaming).toBe(false));
  });

  it('appends a new step and replaces an existing one in place, keeping arrival order', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });

    stream.push({
      type: 'STEP',
      stepKey: 'connect',
      title: 'Connect data source',
      description: 'Inline DB · Vt (gate CD)',
      status: 'RUNNING',
    });
    stream.push({
      type: 'STEP',
      stepKey: 'limits',
      title: 'Compute control limits',
      description: null,
      status: 'PENDING',
    });
    await waitFor(() => expect(result.current.state.steps).toHaveLength(2));

    stream.push({
      type: 'STEP',
      stepKey: 'connect',
      title: 'Connect data source',
      description: 'Inline DB · Vt (gate CD)',
      status: 'SUCCESS',
    });

    await waitFor(() => {
      expect(result.current.state.steps).toEqual([
        {
          stepKey: 'connect',
          title: 'Connect data source',
          description: 'Inline DB · Vt (gate CD)',
          status: 'SUCCESS',
        },
        {
          stepKey: 'limits',
          title: 'Compute control limits',
          description: null,
          status: 'PENDING',
        },
      ]);
    });
  });

  it('ends the run and keeps what was already produced when the user stops it', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });
    stream.push({ type: 'TOKEN', delta: 'Vt is dri' });
    await waitFor(() => expect(result.current.state.liveText).toBe('Vt is dri'));

    act(() => result.current.stop());

    await waitFor(() => {
      expect(result.current.state.stopped).toBe(true);
      expect(result.current.state.isStreaming).toBe(false);
    });
    expect(result.current.state.liveText).toBe('Vt is dri');
  });

  it('lands each streamed event in its own part of the state', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });

    stream.push({ type: 'THINKING', delta: 'The Vt trend ' });
    stream.push({ type: 'THINKING', delta: 'crosses the UCL.' });
    stream.push({ type: 'CODE', delta: '<div ' });
    stream.push({ type: 'CODE', delta: 'id="chart">' });
    stream.push({
      type: 'TABLE',
      tableId: 't1',
      intent: 'OOC wafers',
      columns: ['Lot', 'Wafer'],
      rows: [['A14-001', 3]],
      truncated: true,
    });
    stream.push({
      type: 'ARTIFACT',
      artifactId: 'artifact-9',
      title: 'SPC analysis — Vt (gate CD)',
    });
    stream.push({
      type: 'QUESTION',
      form: {
        formKey: 'dc-item-scope',
        title: 'DC item',
        fields: [{ key: 'items', label: 'DC item', kind: 'dcitem', required: true }],
        submitLabel: '先產生這 3 項',
        disabledHint: '至少選一項',
        summaryLabel: '已選 3 項',
      },
    });
    stream.push({ type: 'ANSWER', text: 'Vt is drifting on A14.' });

    await waitFor(() => expect(result.current.state.answer).toBe('Vt is drifting on A14.'));

    expect(result.current.state.thinking).toBe('The Vt trend crosses the UCL.');
    expect(result.current.state.codeText).toBe('<div id="chart">');
    expect(result.current.state.tables).toEqual([
      {
        tableId: 't1',
        intent: 'OOC wafers',
        columns: ['Lot', 'Wafer'],
        rows: [['A14-001', 3]],
        truncated: true,
      },
    ]);
    expect(result.current.state.artifact).toEqual({
      artifactId: 'artifact-9',
      title: 'SPC analysis — Vt (gate CD)',
    });
    expect(result.current.state.question?.formKey).toBe('dc-item-scope');
  });

  it('records an ERROR event without ending the run, and still takes the steps after it', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });

    stream.push({ type: 'ERROR', code: 'QUERY_TIMEOUT', message: '查詢逾時' });
    await waitFor(() =>
      expect(result.current.state.error).toEqual({ code: 'QUERY_TIMEOUT', message: '查詢逾時' }),
    );
    expect(result.current.state.isStreaming).toBe(true);

    stream.push({
      type: 'STEP',
      stepKey: 'finalize',
      title: 'Finalize',
      description: null,
      status: 'SUCCESS',
    });
    await waitFor(() => expect(result.current.state.steps).toHaveLength(1));

    act(() => stream.close());
    await waitFor(() => expect(result.current.state.isStreaming).toBe(false));
  });

  it('surfaces the backend code and message when the request fails before the stream opens', async () => {
    mockAgentStreamRejection({
      status: 409,
      code: 'CONNECTOR_EXPIRED',
      message: 'Inline 連線已過期',
    });
    const { result } = renderHook(() => useAgentStream('session-1'));

    await act(async () => {
      await result.current.send('Run an SPC analysis on Vt (gate CD).');
    });

    expect(result.current.state.error).toEqual({
      code: 'CONNECTOR_EXPIRED',
      message: 'Inline 連線已過期',
    });
    expect(result.current.state.isStreaming).toBe(false);
    expect(result.current.state.networkError).toBe(false);
  });

  it('reports an unexpected disconnection distinctly from a user-initiated stop', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });
    stream.push({ type: 'TOKEN', delta: 'Vt is dri' });
    await waitFor(() => expect(result.current.state.liveText).toBe('Vt is dri'));

    act(() => stream.disconnect());

    await waitFor(() => {
      expect(result.current.state.networkError).toBe(true);
      expect(result.current.state.isStreaming).toBe(false);
    });
    expect(result.current.state.error).toEqual({
      code: 'NETWORK_ERROR',
      message: '連線中斷，請重新送出一次',
    });
    expect(result.current.state.stopped).toBe(false);
    expect(result.current.state.liveText).toBe('Vt is dri');
  });

  it("reports the finished run's elapsed time, and nothing while idle or streaming", async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    expect(result.current.state.durationMs).toBeNull();

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });
    await waitFor(() => expect(result.current.state.isStreaming).toBe(true));
    expect(result.current.state.durationMs).toBeNull();

    act(() => stream.close());

    await waitFor(() => expect(result.current.state.durationMs).not.toBeNull());
    expect(result.current.state.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('clears everything from the previous run when reset', async () => {
    const stream = mockAgentStream();
    const { result } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });
    stream.push({ type: 'ANSWER', text: 'Vt is drifting on A14.' });
    stream.push({ type: 'THINKING', delta: 'noted' });
    await waitFor(() => expect(result.current.state.answer).not.toBeNull());
    act(() => stream.close());
    await waitFor(() => expect(result.current.state.isStreaming).toBe(false));

    act(() => result.current.reset());

    expect(result.current.state.answer).toBeNull();
    expect(result.current.state.thinking).toBe('');
    expect(result.current.state.durationMs).toBeNull();
  });

  it('aborts the in-flight request when the component unmounts', async () => {
    const stream = mockAgentStream();
    const { result, unmount } = renderHook(() => useAgentStream('session-1'));

    act(() => {
      void result.current.send('Run an SPC analysis on Vt (gate CD).');
    });
    stream.push({ type: 'TOKEN', delta: 'Vt ' });
    await waitFor(() => expect(result.current.state.liveText).toBe('Vt '));

    unmount();

    await waitFor(() => expect(stream.wasAborted).toBe(true));
  });
});
