import { http, HttpResponse } from 'msw';

import { server } from '@/mocks/server';
import type { AgentEvent } from '@/types/api/agentEvent';

export interface MockAgentStream {
  /** Writes one agent event onto the open stream. Safe to call before the request lands. */
  push(event: AgentEvent): void;
  /** Closes the stream, which is how a real run ends. */
  close(): void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** Replaces the message endpoint with a stream the test drives event by event.
 *  Nothing is on a timer: the test decides when the next event arrives, so every
 *  intermediate state of a run is observable. */
export function mockAgentStream(): MockAgentStream {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const buffered: string[] = [];

  function write(chunk: string): void {
    if (controller) {
      controller.enqueue(encoder.encode(chunk));
    } else {
      buffered.push(chunk);
    }
  }

  server.use(
    http.post(`${API_BASE}/sessions/:sessionId/messages`, () => {
      const body = new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
          for (const chunk of buffered) {
            streamController.enqueue(encoder.encode(chunk));
          }
          buffered.length = 0;
        },
      });

      return new HttpResponse(body, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }),
  );

  return {
    push(event) {
      write(`data: ${JSON.stringify(event)}\n\n`);
    },
    close() {
      controller?.close();
    },
  };
}
