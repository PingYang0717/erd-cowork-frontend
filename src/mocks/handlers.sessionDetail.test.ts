import { describe, expect, it } from 'vitest';

import type { SessionDetail, StepItem } from '@/types/api';

import { SCENARIO_FIXTURES } from './scenarioFixtures';

const API_BASE = '/api';

/** The backend nests a session's messages and files inside GET /sessions/{id} —
 *  there is no standalone messages endpoint — and persists messages in its own
 *  Mongo-leaked shape (sender, stepsJson, artifactTitle). */
describe('GET /api/sessions/:sessionId (SessionDetail)', () => {
  it('returns the session with messages in the backend wire shape after a run', async () => {
    const question = 'Generate the Daily Monitor dashboard for A14.';
    const post = await fetch(`${API_BASE}/sessions/session-2/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ question }),
    });
    expect(post.ok).toBe(true);
    // Drain the stream: the run persists before it streams, but leaving the reader
    // open holds the mocked connection.
    const reader = post.body!.getReader();
    while (!(await reader.read()).done) {
      // draining
    }

    const response = await fetch(`${API_BASE}/sessions/session-2`);
    expect(response.ok).toBe(true);
    const detail = (await response.json()) as SessionDetail;

    expect(detail.id).toBe('session-2');
    expect(detail.title).toBe('Defect pareto — W12');
    expect(typeof detail.createdAt).toBe('string');
    expect(Array.isArray(detail.files)).toBe(true);

    const [userMessage, aiMessage] = detail.messages.slice(-2);

    expect(userMessage).toMatchObject({
      sender: 'USER',
      text: question,
      stepsJson: null,
      artifactId: null,
      artifactTitle: null,
      questionsJson: null,
    });
    expect(typeof userMessage.createdAt).toBe('string');
    // The mock's own bookkeeping never reaches the client.
    expect(userMessage).not.toHaveProperty('sessionId');

    expect(aiMessage).toMatchObject({
      sender: 'AI',
      text: SCENARIO_FIXTURES.daily.reply,
      artifactTitle: 'Daily Monitor Dashboard — A14',
    });
    expect(aiMessage.artifactId).not.toBeNull();

    const steps = JSON.parse(aiMessage.stepsJson ?? '[]') as StepItem[];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((step) => step.status === 'SUCCESS')).toBe(true);
  });

  it('404s for a session that does not exist', async () => {
    const response = await fetch(`${API_BASE}/sessions/no-such-session`);
    expect(response.status).toBe(404);
  });
});
