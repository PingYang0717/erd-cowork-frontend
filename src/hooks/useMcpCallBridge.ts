import { type RefObject, useEffect } from 'react';

import { errorCode, errorMessage, httpStatus, isCanceled } from '@/api/apiError';
import { mcpCall } from '@/api/artifactApi';
import { type BrowserJsError, useRepairOfferStore } from '@/stores/useRepairOfferStore';
import type { McpCallBody, McpError, McpErrorCode, McpResult } from '@/types/api';

/** The bridge between an Artifact's iframe and the backend (ADR-0017).
 *
 *  The document in the iframe cannot reach the network — ADR-0001's CSP says
 *  `connect-src 'none'` and that stays. When it needs a Connector, the runtime the
 *  backend injected posts an `erd-mcp-call` up to this window; this hook makes
 *  `POST /artifacts/:id/mcp-call` on its behalf and posts the answer back down as an
 *  `erd-mcp-result` carrying the same `id`. The frontend is a courier: it does not read
 *  the data, does not draw the failures, does not retry. The Artifact does all of that
 *  itself — it is the one that knows what it asked for and what to show instead.
 *
 *  The one thing this hook does beyond carrying is the same thing the error collector
 *  does: two failures — `TOOL_ERROR` and `INVALID_CALL` — mean the HTML wrote its call
 *  wrong, and a rebuild is what fixes that. Those two go to the repair store, and only
 *  when the caller says it has somewhere to show the offer (`offersRepair`): the
 *  full-page view has no thread, so a report from there would sit in the store unseen.
 */

/** iframe → this window. `id` is the iframe runtime's own; it pairs the answer with the
 *  Promise waiting for it and this app never invents one. */
export interface McpCallMessage extends McpCallBody {
  type: 'erd-mcp-call';
  id: string;
}

/** this window → iframe. */
export interface McpResultMessage {
  type: 'erd-mcp-result';
  id: string;
  result: McpResult;
}

/** How long one call may stay in flight before it is abandoned as `RETRYABLE`. */
export const MCP_CALL_TIMEOUT_MS = 30_000;

/** How many calls one iframe may have in flight at once; the rest wait their turn rather
 *  than being refused. A dashboard that fires a dozen queries on load still completes —
 *  just not all at once — and a dashboard stuck in a loop cannot open a hundred
 *  connections. */
export const MCP_CALL_MAX_IN_FLIGHT = 8;

/** The failures that say "the HTML's call is wrong" rather than "the world is not
 *  cooperating" — the ones a repair can actually fix. */
const REPAIR_CODES: ReadonlySet<McpErrorCode> = new Set(['TOOL_ERROR', 'INVALID_CALL']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads the message as a call, or says what is wrong with it. `id` is checked first
 *  and separately: without one there is nobody to tell, so the caller drops it. */
const readCall = (data: unknown): { call: McpCallMessage } | { id: string; problem: string } | null => {
  if (!isRecord(data) || data.type !== 'erd-mcp-call' || typeof data.id !== 'string') {
    return null;
  }
  const { id, connector, tool, args } = data;
  if (typeof connector !== 'string' || connector === '') {
    return { id, problem: '"connector" must be a non-empty string' };
  }
  if (typeof tool !== 'string' || tool === '') {
    return { id, problem: '"tool" must be a non-empty string' };
  }
  if (!isRecord(args)) {
    return { id, problem: '"args" must be an object' };
  }
  return { call: { type: 'erd-mcp-call', id, connector, tool, args } };
};

const isKnownCode = (code: string | null): code is McpErrorCode =>
  code !== null &&
  [
    'AUTH',
    'RETRYABLE',
    'TOOL_ERROR',
    'CONNECTOR_UNREACHABLE',
    'CONNECTOR_UNAVAILABLE',
    'CONNECTOR_NOT_ALLOWED',
    'INVALID_CALL',
  ].includes(code);

/** What to tell the iframe when the request itself failed — nothing came back, or what
 *  came back was not a 200 `McpResult`. The seven codes all travel inside a 200; a
 *  status is the request never reaching a tool, and each status has one meaning:
 *  400 is body validation (`INVALID_CALL`), 404 is "not your Artifact to call from"
 *  (`CONNECTOR_NOT_ALLOWED`), 401/403 is identity (`AUTH`), everything else — offline,
 *  timed out, a gateway page — is worth trying again (`RETRYABLE`). A known code riding
 *  a status is trusted over the status: it is more specific. */
const failureToError = (error: unknown, timedOut: boolean): McpError => {
  const message = errorMessage(error) ?? (error instanceof Error ? error.message : String(error));
  if (timedOut) {
    return { code: 'RETRYABLE', message: `no answer within ${MCP_CALL_TIMEOUT_MS / 1000}s` };
  }
  const code = errorCode(error);
  if (isKnownCode(code)) {
    return { code, message };
  }
  switch (httpStatus(error)) {
    case 400:
      return { code: 'INVALID_CALL', message };
    case 404:
      return { code: 'CONNECTOR_NOT_ALLOWED', message };
    case 401:
    case 403:
      return { code: 'AUTH', message };
    default:
      return { code: 'RETRYABLE', message };
  }
};

/** What the repair endpoint gets. Named so the agent rebuilding the document can tell a
 *  failed call from a thrown exception, and which call it was. No source position: the
 *  call did not throw anywhere. */
const toRepairError = (call: Pick<McpCallMessage, 'connector' | 'tool'>, error: McpError): BrowserJsError => ({
  message: `MCP call ${error.code}: tool "${call.tool}" on connector "${call.connector}": ${error.message}`,
  line: 0,
  col: 0,
});

interface UseMcpCallBridgeOptions {
  artifactId: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  /** Whether a repair offer would be seen from here. The Studio thread shows them; the
   *  full-page view has nowhere to. */
  offersRepair: boolean;
}

export const useMcpCallBridge = ({ artifactId, iframeRef, offersRepair }: UseMcpCallBridgeOptions): void => {
  const report = useRepairOfferStore((store) => store.report);

  // Everything below lives for one mount of one iframe: the listener, the queue, the
  // calls in flight. A remount (Reload, version switch) is a new document with its own
  // runtime and its own ids, so the old ones are cancelled rather than answered — the
  // window they would answer to is gone.
  useEffect(() => {
    let disposed = false;
    let inFlight = 0;
    const waiting: McpCallMessage[] = [];
    const controllers = new Set<AbortController>();

    const reply = (id: string, result: McpResult) => {
      if (disposed) {
        return;
      }
      // '*' is the only target a sandboxed document can be addressed by: its origin is
      // opaque. `event.source` on the way in is what keeps this pairwise.
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'erd-mcp-result', id, result } satisfies McpResultMessage,
        '*'
      );
    };

    const offerRepair = (call: Pick<McpCallMessage, 'connector' | 'tool'>, error: McpError) => {
      if (offersRepair && REPAIR_CODES.has(error.code)) {
        report(artifactId, [toRepairError(call, error)]);
      }
    };

    const settle = (call: McpCallMessage, result: McpResult) => {
      reply(call.id, result);
      if ('error' in result) {
        offerRepair(call, result.error);
      }
    };

    const run = async (call: McpCallMessage) => {
      const controller = new AbortController();
      controllers.add(controller);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, MCP_CALL_TIMEOUT_MS);
      inFlight += 1;
      try {
        const { connector, tool, args } = call;
        settle(call, await mcpCall(artifactId, { connector, tool, args }, controller.signal));
      } catch (error) {
        // Cancelled by the timer is a failure to report; cancelled by unmount is not —
        // there is nobody left to report to.
        if (!(isCanceled(error) && !timedOut)) {
          settle(call, { error: failureToError(error, timedOut) });
        }
      } finally {
        clearTimeout(timer);
        controllers.delete(controller);
        inFlight -= 1;
        pump();
      }
    };

    const pump = () => {
      while (!disposed && inFlight < MCP_CALL_MAX_IN_FLIGHT && waiting.length > 0) {
        void run(waiting.shift() as McpCallMessage);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      // Only this iframe: any page can postMessage at us.
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      const read = readCall(event.data);
      if (read === null) {
        return;
      }
      if ('problem' in read) {
        // Sent nowhere: a malformed call is the HTML's mistake, and the repair offer is
        // the only thing this app has to say about that.
        const error: McpError = { code: 'INVALID_CALL', message: read.problem };
        reply(read.id, { error });
        const data = event.data as Partial<McpCallBody>;
        offerRepair(
          {
            connector: typeof data.connector === 'string' ? data.connector : '?',
            tool: typeof data.tool === 'string' ? data.tool : '?',
          },
          error
        );
        return;
      }
      waiting.push(read.call);
      pump();
    };

    window.addEventListener('message', handleMessage);
    return () => {
      disposed = true;
      window.removeEventListener('message', handleMessage);
      waiting.length = 0;
      for (const controller of controllers) {
        controller.abort();
      }
    };
  }, [artifactId, iframeRef, offersRepair, report]);
};
