import { http, HttpResponse } from 'msw';

import { upsertSession } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import type { AgentEvent } from '@/types/api/agentEvent';

export interface MockAgentStream {
  /** Writes one agent event onto the open stream. Safe to call before the request lands. */
  push(event: AgentEvent): void;
  /** Closes the stream, which is how a real run ends. */
  close(): void;
  /** Kills the stream mid-flight, the way a dropped connection does — no close frame,
   *  the reader just errors. */
  disconnect(): void;
  /** Whether the request itself was aborted (user stop, or the component unmounting). */
  readonly wasAborted: boolean;
  /** Bodies of every request the endpoint received, in order. */
  readonly requests: unknown[];
  /** `X-User-Id` of every request the endpoint received, in order. */
  readonly userIds: (string | null)[];
}

const API_BASE = '/api';

/** Replaces the message endpoint with a stream the test drives event by event.
 *  Nothing is on a timer: the test decides when the next event arrives, so every
 *  intermediate state of a run is observable. */
export function mockAgentStream(): MockAgentStream {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let aborted = false;
  const requests: unknown[] = [];
  const userIds: (string | null)[] = [];
  const buffered: string[] = [];

  function write(chunk: string): void {
    if (controller) {
      controller.enqueue(encoder.encode(chunk));
    } else {
      buffered.push(chunk);
    }
  }

  server.use(
    http.post(`${API_BASE}/sessions/:sessionId/messages`, async ({ params, request }) => {
      // Sending is what creates the session (ADR-0005); a stub standing in for this
      // endpoint has to do that too, or the post-run refetch 404s on a draft.
      upsertSession(params.sessionId as string);
      requests.push(await request.clone().json());
      userIds.push(request.headers.get('X-User-Id'));
      request.signal.addEventListener('abort', () => {
        aborted = true;
      });

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
    disconnect() {
      controller?.error(new Error('socket hang up'));
    },
    get wasAborted() {
      return aborted;
    },
    requests,
    userIds,
  };
}

/** Makes the message endpoint fail before any stream opens, the way a real backend
 *  reports a refusal: a non-2xx status with a JSON `{ code, message }` body. */
export function mockAgentStreamRejection(failure: {
  status: number;
  code: string;
  message: string;
}): void {
  server.use(
    http.post(`${API_BASE}/sessions/:sessionId/messages`, () =>
      HttpResponse.json(
        { code: failure.code, message: failure.message },
        { status: failure.status },
      ),
    ),
  );
}
