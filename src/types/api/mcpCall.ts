/** What an Artifact's HTML can ask of a Connector while it is on screen, and what it
 *  gets back. The document itself cannot reach the network (ADR-0001's CSP), so the call
 *  crosses to this app by postMessage, this app makes the request, and the answer crosses
 *  back — see ADR-0017 and `hooks/useMcpCallBridge.ts`. */

/** The known codes, written out once: the type below is derived from this list, and so
 *  is the check that narrows a backend `code` to one of them (`useMcpCallBridge`), so the
 *  two cannot drift apart. */
export const KNOWN_MCP_ERROR_CODES = [
  'AUTH',
  'RETRYABLE',
  'TOOL_ERROR',
  'CONNECTOR_UNREACHABLE',
  'CONNECTOR_UNAVAILABLE',
  'CONNECTOR_NOT_ALLOWED',
  'INVALID_CALL',
] as const;

export type KnownMcpErrorCode = (typeof KNOWN_MCP_ERROR_CODES)[number];

/** Open union: the frontend never branches on the whole list — it forwards whatever the
 *  backend sends — and the backend will add to it. Only the two `REPAIR` ones are read
 *  by name. */
export type McpErrorCode = KnownMcpErrorCode | (string & {});

export interface McpError {
  code: McpErrorCode;
  /** The backend's or the tool's own sentence. Forwarded verbatim; the Artifact shows
   *  it, this app never does. */
  message: string;
}

/** Exactly one of the two. The HTTP endpoint answers with this at 200 whether the tool
 *  succeeded or not — a tool failing is a normal outcome of asking it, not a failure of
 *  the request that asked. */
export type McpResult = { data: unknown } | { error: McpError };

/** `POST /artifacts/:id/mcp-call` body. `connector` is `Connector.id`. The Artifact is
 *  in the path rather than the body: it is what the backend authorises against. */
export interface McpCallBody {
  connector: string;
  tool: string;
  args: Record<string, unknown>;
}
