import type { AgentEvent } from '@/types/api/agentEvent';

export interface SseParser {
  feed(chunk: string): void;
  /** Emits whatever is left in the buffer. Call once the stream has closed, so a final
   *  event that never received its terminating blank line is not silently dropped. */
  flush(): void;
}

/** Incremental SSE parser: calls `onEvent` for each agent event, separated by blank lines.
 *  Chunks arrive at arbitrary byte boundaries, so a partial event is buffered until its
 *  terminating blank line shows up in a later chunk. */
export const createSseParser = (onEvent: (event: AgentEvent) => void): SseParser => {
  let buffer = '';

  const processBlock = (block: string): void => {
    const dataLines = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''));

    if (dataLines.length === 0) {
      return;
    }

    try {
      onEvent(JSON.parse(dataLines.join('\n')) as AgentEvent);
    } catch {
      // A truncated or corrupt block is dropped rather than killing the stream —
      // the events after it are still worth delivering. Logged, not silent: a
      // dropped TOKEN block is missing reply text with no signal anywhere, and this
      // line is the only place that knows it happened.
      console.warn('[eRD Cowork] dropped an unparseable stream block', dataLines.join('\n'));
    }
  };

  return {
    feed(chunk: string): void {
      buffer += chunk;

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        if (block.trim()) {
          processBlock(block);
        }
      }
    },

    flush(): void {
      if (buffer.trim()) {
        processBlock(buffer);
      }
      buffer = '';
    },
  };
};
