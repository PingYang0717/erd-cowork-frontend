import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

import { MCP_CALL_MAX_IN_FLIGHT, MCP_CALL_TIMEOUT_MS, type McpResultMessage } from '@/hooks/useMcpCallBridge';
import { server } from '@/mocks/server';
import { useRepairOfferStore } from '@/stores/useRepairOfferStore';
import type { McpResult } from '@/types/api';
import ArtifactFrame from './ArtifactFrame';

const ARTIFACT_ID = 'artifact-1';
const HTML = '<!DOCTYPE html><html><head></head><body></body></html>';

/** Mounts a frame and taps the channel back into it. jsdom does not run the document's
 *  scripts, so the runtime the backend injects cannot post on its own — the tests post
 *  what it would. */
const renderFrame = (offersMcpRepair = true) => {
  const view = render(<ArtifactFrame html={HTML} artifactId={ARTIFACT_ID} offersMcpRepair={offersMcpRepair} />);
  const iframe = screen.getByTitle('Artifact preview') as HTMLIFrameElement;
  const target = iframe.contentWindow as Window;
  const posted = vi.spyOn(target, 'postMessage');
  return { ...view, iframe, posted };
};

const post = (iframe: HTMLIFrameElement, data: unknown, source: MessageEventSource | null = iframe.contentWindow) => {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, source }));
  });
};

const aCall = (overrides: Record<string, unknown> = {}) => ({
  type: 'erd-mcp-call',
  id: 'req-1',
  connector: 'conn-inline',
  tool: 'query_spc',
  args: { partId: 'PT-01' },
  ...overrides,
});

const results = (posted: ReturnType<typeof vi.spyOn>): McpResultMessage[] =>
  posted.mock.calls.map(([message]) => message as McpResultMessage);

/** The backend answers 200 with this whatever the tool did; a request that fails is a
 *  status with the usual `{ code, message }`. */
const answerWith = (result: McpResult) => {
  const seen: unknown[] = [];
  server.use(
    http.post(`/api/artifacts/${ARTIFACT_ID}/mcp-call`, async ({ request }) => {
      seen.push(await request.json());
      return HttpResponse.json(result);
    })
  );
  return seen;
};

const failWith = (status: number, body: unknown = { code: 'SOMETHING', message: `status ${status}` }) => {
  server.use(http.post(`/api/artifacts/${ARTIFACT_ID}/mcp-call`, () => HttpResponse.json(body, { status })));
};

const currentOffer = () => useRepairOfferStore.getState().offer;

describe('ArtifactFrame — MCP call bridge', () => {
  beforeEach(() => {
    useRepairOfferStore.setState(useRepairOfferStore.getInitialState());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('makes the call on the artifact’s behalf and posts the data back under the same id', async () => {
    const seen = answerWith({ data: { rows: [1, 2, 3] } });
    const { iframe, posted } = renderFrame();

    post(iframe, aCall({ id: 'abc-123' }));

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(seen).toEqual([{ connector: 'conn-inline', tool: 'query_spc', args: { partId: 'PT-01' } }]);
    expect(results(posted)[0]).toEqual({
      type: 'erd-mcp-result',
      id: 'abc-123',
      result: { data: { rows: [1, 2, 3] } },
    });
    expect(posted.mock.calls[0][1]).toBe('*');
  });

  it('forwards a tool failure verbatim and, for TOOL_ERROR, offers a repair naming the call', async () => {
    answerWith({ error: { code: 'TOOL_ERROR', message: 'query syntax error near "FROM"' } });
    const { iframe, posted } = renderFrame();

    post(iframe, aCall());

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(results(posted)[0].result).toEqual({
      error: { code: 'TOOL_ERROR', message: 'query syntax error near "FROM"' },
    });
    expect(currentOffer()).toMatchObject({
      artifactId: ARTIFACT_ID,
      errors: [
        {
          message: 'MCP call TOOL_ERROR: tool "query_spc" on connector "conn-inline": query syntax error near "FROM"',
          line: 0,
          col: 0,
        },
      ],
    });
  });

  it.each(['AUTH', 'RETRYABLE', 'CONNECTOR_UNREACHABLE', 'CONNECTOR_UNAVAILABLE', 'CONNECTOR_NOT_ALLOWED'])(
    'forwards %s to the artifact without offering a repair — that is not the HTML’s fault',
    async (code) => {
      answerWith({ error: { code, message: 'nope' } });
      const { iframe, posted } = renderFrame();

      post(iframe, aCall());

      await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
      expect(results(posted)[0].result).toEqual({ error: { code, message: 'nope' } });
      expect(currentOffer()).toBeNull();
    }
  );

  it('still forwards TOOL_ERROR but offers no repair where nothing would show it (full-page view)', async () => {
    answerWith({ error: { code: 'TOOL_ERROR', message: 'boom' } });
    const { iframe, posted } = renderFrame(false);

    post(iframe, aCall());

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(results(posted)[0].result).toEqual({ error: { code: 'TOOL_ERROR', message: 'boom' } });
    expect(currentOffer()).toBeNull();
  });

  it('answers a malformed call with INVALID_CALL without asking the backend, and offers a repair', async () => {
    const seen = answerWith({ data: null });
    const { iframe, posted } = renderFrame();

    post(iframe, aCall({ args: 'not-an-object' }));

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(results(posted)[0]).toMatchObject({
      id: 'req-1',
      result: { error: { code: 'INVALID_CALL', message: expect.stringContaining('"args"') } },
    });
    expect(seen).toEqual([]);
    expect(currentOffer()?.errors[0].message).toContain('MCP call INVALID_CALL: tool "query_spc"');
  });

  it('drops a call with no id — there is nobody to answer', async () => {
    const seen = answerWith({ data: null });
    const { iframe, posted } = renderFrame();

    post(iframe, aCall({ id: undefined }));
    post(iframe, aCall({ id: 42 }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(posted).not.toHaveBeenCalled();
    expect(seen).toEqual([]);
    expect(currentOffer()).toBeNull();
  });

  it('ignores a call that did not come from its own iframe', async () => {
    const seen = answerWith({ data: null });
    const { iframe, posted } = renderFrame();

    post(iframe, aCall(), null);
    post(iframe, aCall(), window);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(posted).not.toHaveBeenCalled();
    expect(seen).toEqual([]);
  });

  it.each([
    [400, 'INVALID_CALL'],
    [404, 'CONNECTOR_NOT_ALLOWED'],
    [401, 'AUTH'],
    [403, 'AUTH'],
    [500, 'RETRYABLE'],
    [502, 'RETRYABLE'],
  ])('turns HTTP %s into %s for the artifact, carrying the backend’s message', async (status, code) => {
    failWith(status);
    const { iframe, posted } = renderFrame();

    post(iframe, aCall());

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(results(posted)[0].result).toEqual({ error: { code, message: `status ${status}` } });
  });

  it('offers a repair for a 400 — body validation failing is the HTML’s call being wrong', async () => {
    failWith(400, { code: 'BAD_REQUEST', message: 'args.partId must be a string' });
    const { iframe, posted } = renderFrame();

    post(iframe, aCall());

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(currentOffer()?.errors[0].message).toBe(
      'MCP call INVALID_CALL: tool "query_spc" on connector "conn-inline": args.partId must be a string'
    );
  });

  it('trusts a known code riding a status over the status itself', async () => {
    failWith(403, { code: 'CONNECTOR_NOT_ALLOWED', message: 'session has not selected this source' });
    const { iframe, posted } = renderFrame();

    post(iframe, aCall());

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(results(posted)[0].result).toEqual({
      error: { code: 'CONNECTOR_NOT_ALLOWED', message: 'session has not selected this source' },
    });
  });

  it(`holds the ${MCP_CALL_MAX_IN_FLIGHT + 1}th call back until one of the first ${MCP_CALL_MAX_IN_FLIGHT} has answered`, async () => {
    let started = 0;
    const releases: Array<() => void> = [];
    server.use(
      http.post(`/api/artifacts/${ARTIFACT_ID}/mcp-call`, async () => {
        started += 1;
        await new Promise<void>((resolve) => releases.push(resolve));
        return HttpResponse.json({ data: null });
      })
    );
    const { iframe, posted } = renderFrame();

    for (let i = 0; i < MCP_CALL_MAX_IN_FLIGHT + 1; i += 1) {
      post(iframe, aCall({ id: `req-${i}` }));
    }

    await waitFor(() => expect(started).toBe(MCP_CALL_MAX_IN_FLIGHT));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(started).toBe(MCP_CALL_MAX_IN_FLIGHT);

    releases[0]();

    await waitFor(() => expect(started).toBe(MCP_CALL_MAX_IN_FLIGHT + 1));
    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(results(posted)[0].id).toBe('req-0');
  });

  it(`gives up on a call after ${MCP_CALL_TIMEOUT_MS / 1000}s as RETRYABLE`, async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    server.use(
      http.post(`/api/artifacts/${ARTIFACT_ID}/mcp-call`, async () => {
        await new Promise(() => {});
        return HttpResponse.json({ data: null });
      })
    );
    const { iframe, posted } = renderFrame();

    post(iframe, aCall());
    act(() => {
      vi.advanceTimersByTime(MCP_CALL_TIMEOUT_MS);
    });
    vi.useRealTimers();

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
    expect(results(posted)[0].result).toMatchObject({ error: { code: 'RETRYABLE' } });
    expect(currentOffer()).toBeNull();
  });

  it('answers nothing once the iframe is gone — the window it would answer is not there', async () => {
    let release: () => void = () => {};
    server.use(
      http.post(`/api/artifacts/${ARTIFACT_ID}/mcp-call`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ data: null });
      })
    );
    const { iframe, posted, unmount } = renderFrame();

    post(iframe, aCall());
    await waitFor(() => expect(release).not.toBe(undefined));
    unmount();
    release();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(posted).not.toHaveBeenCalled();
    expect(currentOffer()).toBeNull();
  });
});
