import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { useAccessDeniedStore } from '@/stores/useAccessDeniedStore';
import { streamAgentMessage } from './agentApi';
import { apiClient } from './apiClient';

/** A 403 is a fact about the account, not about the one request that happened to hit it:
 *  every other request in flight is refused for the same reason. So it is caught once, in
 *  the two places every request goes through, rather than at each call site — a new
 *  endpoint cannot forget to handle it.
 *
 *  Both transports are covered here because the agent stream reaches the network through
 *  raw `fetch` (axios cannot surface a body incrementally, ADR-0003) and so inherits
 *  nothing from the axios interceptor. */
describe('access denied', () => {
  beforeEach(() => useAccessDeniedStore.getState().clear());

  it('denies access on a 403 that rode axios, keeping the backend sentence to show', async () => {
    server.use(
      http.get('/api/sessions', () =>
        HttpResponse.json({ code: 'ACCESS_DENIED', message: 'User is not a member of A10INTD1-1' }, { status: 403 })
      )
    );

    await expect(apiClient.get('/sessions')).rejects.toThrow();

    expect(useAccessDeniedStore.getState().denial).toEqual({
      code: 'ACCESS_DENIED',
      message: 'User is not a member of A10INTD1-1',
    });
  });

  it('denies access on a 403 that rode the stream’s raw fetch', async () => {
    server.use(
      http.post('/api/sessions/:id/messages', () =>
        HttpResponse.json({ code: 'ENTITLEMENT_DENIED', message: 'A4 entitlement required' }, { status: 403 })
      )
    );

    const stream = streamAgentMessage({
      sessionId: 'session-1',
      question: 'hi',
      signal: new AbortController().signal,
    });
    await expect(stream.next()).rejects.toThrow();

    expect(useAccessDeniedStore.getState().denial).toEqual({
      code: 'ENTITLEMENT_DENIED',
      message: 'A4 entitlement required',
    });
  });

  /** Every other failure keeps going to the caller that asked for it. A 500 or a 404 says
   *  nothing about the account, and locking the app on one would take the user out of a
   *  screen that still works. */
  it('leaves every other failure alone', async () => {
    server.use(http.get('/api/sessions', () => HttpResponse.json({ code: 'CONFLICT' }, { status: 409 })));

    await expect(apiClient.get('/sessions')).rejects.toThrow();

    expect(useAccessDeniedStore.getState().denial).toBeNull();
  });
});
