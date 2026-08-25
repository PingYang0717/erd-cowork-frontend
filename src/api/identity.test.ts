import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { streamAgentMessage } from '@/api/agentApi';
import { apiClient } from '@/api/apiClient';
import {
  getAuthHeaders,
  resetIdentity,
  setAuthHeaderProvider,
  USER_ID_STORAGE_KEY,
} from '@/api/identity';
import { server } from '@/mocks/server';
import { mockAgentStream } from '@/test/agentStream';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function captureHeaderOn(path: string) {
  const seen: (string | null)[] = [];
  server.use(
    http.get(`${API_BASE}${path}`, ({ request }) => {
      seen.push(request.headers.get('X-User-Id'));
      return HttpResponse.json([]);
    }),
  );
  return seen;
}

describe('multi-user identity', () => {
  afterEach(() => {
    setAuthHeaderProvider(null);
    resetIdentity();
  });

  it('mints an anonymous id once and keeps reusing it', () => {
    resetIdentity();
    localStorage.removeItem(USER_ID_STORAGE_KEY);

    const first = getAuthHeaders()['X-User-Id'];

    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBe(first);
    expect(getAuthHeaders()['X-User-Id']).toBe(first);
  });

  it('attaches the id to every request the shared client makes', async () => {
    const seen = captureHeaderOn('/sessions');

    await apiClient.get('/sessions');

    expect(seen).toEqual([getAuthHeaders()['X-User-Id']]);
  });

  it('lets the internal environment supply the header instead', async () => {
    setAuthHeaderProvider(() => ({ 'X-User-Id': 'sso-injected' }));
    const seen = captureHeaderOn('/sessions');

    await apiClient.get('/sessions');

    expect(seen).toEqual(['sso-injected']);
  });

  it('sends no id of its own when the gateway injects one', async () => {
    // An internal deployment has the gateway stamp the header on the way through,
    // so the browser must not overwrite it with an anonymous one.
    setAuthHeaderProvider(() => ({}));
    const seen = captureHeaderOn('/sessions');

    await apiClient.get('/sessions');

    expect(seen).toEqual([null]);
  });

  it('attaches the id to the streamed run too, which does not go through axios', async () => {
    const stream = mockAgentStream();

    const events = streamAgentMessage({
      sessionId: 'session-1',
      question: 'Generate the Daily Monitor dashboard for A14.',
      signal: new AbortController().signal,
    });
    const started = events.next();
    await waitFor(() => expect(stream.userIds).toHaveLength(1));
    stream.close();
    await started;

    expect(stream.userIds).toEqual([getAuthHeaders()['X-User-Id']]);
  });
});
