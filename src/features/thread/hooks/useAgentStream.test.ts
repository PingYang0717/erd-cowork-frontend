import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockAgentStream } from '@/test/agentStream';

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
});
