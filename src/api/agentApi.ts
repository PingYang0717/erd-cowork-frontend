import { getAuthHeaders } from '@/api/identity';
import type { AgentEvent } from '@/types/api/agentEvent';
import { createSseParser } from '@/utils/sseParser';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** A refusal the backend reported before the stream opened, carrying its own code so
 *  the UI can say something better than "request failed". */
export class AgentStreamHttpError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AgentStreamHttpError';
    this.code = code;
  }
}

/** One turn of a run, in the backend's own body shape: `{ question, baseArtifactId? }`
 *  (SendMessageRequest on the Java side). Everything the UI knows beyond the question —
 *  scenario, artifact kind, structured answers — stays client-side; a reask's answers
 *  travel as prose composed by `utils/composeAnswerText`. */
export interface SendMessageArgs {
  sessionId: string;
  question: string;
  /** Iterate on an existing Artifact version rather than starting from nothing. */
  baseArtifactId?: string;
  signal: AbortSignal;
}

/** POSTs a message and yields decoded agent events until the stream closes.
 *  Goes through raw `fetch` rather than `api/apiClient.ts`: axios cannot
 *  surface a response body incrementally. */
export async function* streamAgentMessage(
  args: SendMessageArgs,
): AsyncGenerator<AgentEvent, void, void> {
  const response = await fetch(`${API_BASE}/sessions/${args.sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      question: args.question,
      baseArtifactId: args.baseArtifactId,
    }),
    signal: args.signal,
  });

  if (!response.ok) {
    let code = String(response.status);
    let message = 'Unknown error';
    try {
      const body = (await response.json()) as { code?: string; message?: string };
      if (body.code) {
        code = body.code;
      }
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Not a JSON body — the status code alone is all we can report.
    }
    throw new AgentStreamHttpError(code, message);
  }

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // A pending read() does not always reject when the request is aborted (a mocked
  // response body is not wired to the request signal at all), so cancel the reader
  // explicitly: the in-flight read then resolves as done and the loop ends.
  const cancelOnAbort = (): void => {
    void reader.cancel().catch(() => {});
  };
  args.signal.addEventListener('abort', cancelOnAbort, { once: true });
  const ready: AgentEvent[] = [];
  const parser = createSseParser((event) => ready.push(event));

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parser.feed(decoder.decode(value, { stream: true }));
      while (ready.length > 0) {
        yield ready.shift()!;
      }
    }

    parser.feed(decoder.decode());
    parser.flush();
    while (ready.length > 0) {
      yield ready.shift()!;
    }
  } finally {
    args.signal.removeEventListener('abort', cancelOnAbort);
    // Cancel before releasing the lock so the connection is freed immediately; the
    // caller already has everything it needs, so a failure here is not interesting.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
