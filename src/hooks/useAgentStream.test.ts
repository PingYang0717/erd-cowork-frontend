import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { en } from '@/i18n/en';
import { mockAgentStream, mockAgentStreamRejection } from '@/test/agentStream';
import { appWrapper } from '@/test/appHarness';
import { useAgentStream } from './useAgentStream';

/** The hook now owns the post-run invalidation, so it needs a QueryClient around it. */
const renderAgentStream = (sessionId = 'session-1') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    ...renderHook(() => useAgentStream(sessionId), { wrapper: appWrapper({ queryClient }) }),
  };
};

describe('useAgentStream', () => {
  it('accumulates TOKEN deltas into the live reply text while streaming', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
    });

    stream.push({ type: 'TOKEN', delta: 'Vt ' });
    stream.push({ type: 'TOKEN', delta: 'is drifting on A14.' });

    await waitFor(() => {
      expect(result.current.state.liveText).toBe('Vt is drifting on A14.');
    });
  });

  it('is streaming from send() until the stream closes', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    expect(result.current.state.isStreaming).toBe(false);

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
    });
    await waitFor(() => expect(result.current.state.isStreaming).toBe(true));

    stream.push({ type: 'ANSWER', text: 'Done.' });
    expect(result.current.state.isStreaming).toBe(true);

    act(() => stream.close());

    await waitFor(() => expect(result.current.state.isStreaming).toBe(false));
  });

  it('appends a new step and replaces an existing one in place, keeping arrival order', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
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
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
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

  /** ADR-0015 §stop-is-a-no-op-when-idle: stop() only acts while the stream is being read. On an idle hook there is
   *  nothing to stop — a click that flagged `stopped` here would render a 「已停止」
   *  ghost bubble next to a run that never happened (the real bug fired in the finishing
   *  window, where the button still says Stop after the last event). */
  it('does nothing when stop() is called with no run in flight', () => {
    const { result } = renderAgentStream();

    act(() => result.current.stop());

    expect(result.current.state.stopped).toBe(false);
    expect(result.current.state.isStreaming).toBe(false);
  });

  it('does nothing when stop() is called after the stream has already closed', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis.' });
    });
    stream.push({ type: 'TOKEN', delta: 'done' });
    await waitFor(() => expect(result.current.state.liveText).toBe('done'));
    act(() => stream.close());
    await waitFor(() => expect(result.current.state.isStreaming).toBe(false));

    // The run finished on its own; a late Stop must not retroactively mark it stopped.
    act(() => result.current.stop());
    expect(result.current.state.stopped).toBe(false);
  });

  it('lands each streamed event in its own part of the state', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
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
      questions: [{ text: 'DC item', options: [], multiSelect: true }],
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

  it('lifts a flat backend QUESTION into a renderable form when no form extension rides along', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'What is the CP Test status?' });
    });

    stream.push({
      type: 'QUESTION',
      questions: [{ text: 'Which lots?', options: ['A14', 'N5'], multiSelect: true }],
    });

    await waitFor(() => expect(result.current.state.question).not.toBeNull());
    expect(result.current.state.question?.formKey).toBe('backend-question');
    expect(result.current.state.question?.fields[0]).toMatchObject({
      label: 'Which lots?',
      kind: 'multi',
    });
  });

  it('records an ERROR event without ending the run, and still takes the steps after it', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
    });

    stream.push({ type: 'ERROR', code: 'QUERY_TIMEOUT', message: '查詢逾時' });
    await waitFor(() => expect(result.current.state.error).toEqual({ code: 'QUERY_TIMEOUT', message: '查詢逾時' }));
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
    const { result } = renderAgentStream();

    await act(async () => {
      await result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
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
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
    });
    stream.push({ type: 'TOKEN', delta: 'Vt is dri' });
    await waitFor(() => expect(result.current.state.liveText).toBe('Vt is dri'));

    act(() => stream.disconnect());

    await waitFor(() => {
      expect(result.current.state.networkError).toBe(true);
      expect(result.current.state.isStreaming).toBe(false);
    });
    // Against the dictionary, not a copy of the string. This is also what pins the
    // message being read when the disconnect happens rather than when the module was
    // imported: a module constant would freeze on the language current at import —
    // Chinese, before the suite pins English — and this assertion would fail.
    expect(result.current.state.error).toEqual({
      code: 'NETWORK_ERROR',
      message: en.chat.networkError,
    });
    expect(result.current.state.stopped).toBe(false);
    expect(result.current.state.liveText).toBe('Vt is dri');
  });

  it("reports the finished run's elapsed time, and nothing while idle or streaming", async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    expect(result.current.state.durationMs).toBeNull();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
    });
    await waitFor(() => expect(result.current.state.isStreaming).toBe(true));
    expect(result.current.state.durationMs).toBeNull();

    act(() => stream.close());

    await waitFor(() => expect(result.current.state.durationMs).not.toBeNull());
    expect(result.current.state.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('clears everything from the previous run when reset', async () => {
    const stream = mockAgentStream();
    const { result } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
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
    const { result, unmount } = renderAgentStream();

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
    });
    stream.push({ type: 'TOKEN', delta: 'Vt ' });
    await waitFor(() => expect(result.current.state.liveText).toBe('Vt '));

    unmount();

    await waitFor(() => expect(stream.wasAborted).toBe(true));
  });

  it('refreshes the session detail and the sessions list before reporting the run done', async () => {
    const stream = mockAgentStream();
    const { result, queryClient } = renderAgentStream('sess-42');
    let resolveInvalidate!: () => void;
    const gate = new Promise<void>((resolve) => {
      resolveInvalidate = resolve;
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(gate);

    act(() => {
      void result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
    });
    stream.push({ type: 'TOKEN', delta: 'x' });
    await waitFor(() => expect(result.current.state.liveText).toBe('x'));

    act(() => stream.close());

    // Stream fully read, but DONE waits on the invalidation so the live bubble
    // never hands over to a stale history (no flicker). One prefix invalidate covers
    // the list AND the detail (['sessions', id] sits under ['sessions']) — invalidating
    // them separately made the detail refetch get cancelled and reissued every run.
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] }));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(result.current.state.isStreaming).toBe(true);

    await act(async () => {
      resolveInvalidate();
    });
    await waitFor(() => expect(result.current.state.isStreaming).toBe(false));
  });

  it('after an aborted run, re-fetches history in two delayed stages to catch async persistence', async () => {
    vi.useFakeTimers();
    try {
      const { result, queryClient } = renderAgentStream('sess-stop');
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

      // A stream that yields one token, then dies with AbortError — the live path a
      // real backend takes when the user stops a run mid-flight.
      const encoder = new TextEncoder();
      let readCount = 0;
      const abortingBody = {
        getReader: () => ({
          read: async () => {
            readCount += 1;
            if (readCount === 1) {
              return {
                value: encoder.encode('data: {"type":"TOKEN","delta":"partial"}\n\n'),
                done: false,
              };
            }
            throw Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
          },
          cancel: async () => undefined,
          releaseLock: () => undefined,
        }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: abortingBody }));

      await act(async () => {
        await result.current.send({ question: 'Run an SPC analysis on Vt (gate CD).' });
      });

      // What streamed stays; DONE is immediate; nothing refetched yet — the backend
      // persists an aborted run asynchronously (doOnCancel), so refetching now races it.
      expect(result.current.state.liveText).toBe('partial');
      expect(result.current.state.isStreaming).toBe(false);
      expect(invalidateSpy).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(800);
      });
      // One prefix invalidate per stage — the detail key sits under ['sessions'].
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(800);
      });
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
