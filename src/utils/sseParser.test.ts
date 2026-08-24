import { describe, expect, it } from 'vitest';

import type { AgentEvent } from '@/types/api/agentEvent';

import { createSseParser } from './sseParser';

function collect() {
  const events: AgentEvent[] = [];
  const parser = createSseParser((event) => events.push(event));
  return { events, parser };
}

describe('SSE parser', () => {
  it('emits one agent event for a complete data block', () => {
    const { events, parser } = collect();

    parser.feed('data: {"type":"TOKEN","delta":"Vt "}\n\n');

    expect(events).toEqual([{ type: 'TOKEN', delta: 'Vt ' }]);
  });

  it('emits one event per blank-line-separated block in a single chunk', () => {
    const { events, parser } = collect();

    parser.feed(
      'data: {"type":"TOKEN","delta":"Vt "}\n\n' +
        'data: {"type":"TOKEN","delta":"is drifting"}\n\n' +
        'data: {"type":"ANSWER","text":"Vt is drifting"}\n\n',
    );

    expect(events).toEqual([
      { type: 'TOKEN', delta: 'Vt ' },
      { type: 'TOKEN', delta: 'is drifting' },
      { type: 'ANSWER', text: 'Vt is drifting' },
    ]);
  });

  it('buffers an event split across chunk boundaries until it is complete', () => {
    const { events, parser } = collect();

    parser.feed('data: {"type":"STEP","stepKey":"1","title":"Connect');
    expect(events).toEqual([]);

    parser.feed(' data source","description":null,"status":"RUNNING"}\n\n');

    expect(events).toEqual([
      {
        type: 'STEP',
        stepKey: '1',
        title: 'Connect data source',
        description: null,
        status: 'RUNNING',
      },
    ]);
  });

  it('discards a malformed block and keeps parsing the ones after it', () => {
    const { events, parser } = collect();

    parser.feed(
      'data: {"type":"TOKEN","delta":"ok"}\n\n' +
        'data: {"type":"TOKEN","delta":\n\n' +
        'data: {"type":"ANSWER","text":"done"}\n\n',
    );

    expect(events).toEqual([
      { type: 'TOKEN', delta: 'ok' },
      { type: 'ANSWER', text: 'done' },
    ]);
  });

  it('ignores heartbeat comment lines, whether alone or beside a data line', () => {
    const { events, parser } = collect();

    parser.feed(': keep-alive\n\n' + ': ping\ndata: {"type":"TOKEN","delta":"x"}\n\n');

    expect(events).toEqual([{ type: 'TOKEN', delta: 'x' }]);
  });

  it('emits a trailing block that never got its blank line, on flush', () => {
    const { events, parser } = collect();

    parser.feed('data: {"type":"ANSWER","text":"last"}');
    expect(events).toEqual([]);

    parser.flush();

    expect(events).toEqual([{ type: 'ANSWER', text: 'last' }]);
  });

  it('emits nothing on flush when the buffer holds no data line', () => {
    const { events, parser } = collect();

    parser.feed('data: {"type":"TOKEN","delta":"x"}\n\n: trailing heartbeat');
    parser.flush();

    expect(events).toEqual([{ type: 'TOKEN', delta: 'x' }]);
  });
});
