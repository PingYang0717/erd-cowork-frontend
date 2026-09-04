import { describe, expect, it } from 'vitest';

import { streamAgentMessage } from '@/api/agentApi';
import type { AgentEvent } from '@/types/api/agentEvent';
import { SCENARIO_FIXTURES } from './scenarioFixtures';

const collect = async (sessionId: string, question: string, baseArtifactId?: string) => {
  const events: AgentEvent[] = [];
  for await (const event of streamAgentMessage({
    sessionId,
    question,
    baseArtifactId,
    signal: new AbortController().signal,
  })) {
    events.push(event);
  }
  return events;
};

/** Iterating on an artifact (baseArtifactId) inherits its scenario and kind — but an
 *  explicit keyword in the question still wins, the way the backend LLM would read a
 *  topic change. Seeded artifact-3: scenario daily, kind slides. */
describe('POST /sessions/:id/messages with baseArtifactId', () => {
  it('inherits the base artifact scenario and kind for a neutral question', async () => {
    const events = await collect('session-base-1', 'Regenerate the dashboard.', 'artifact-3');

    const answer = events.find((event) => event.type === 'ANSWER');
    expect(answer).toMatchObject({ text: SCENARIO_FIXTURES.daily.reply });
    const artifact = events.find((event) => event.type === 'ARTIFACT');
    expect(artifact && 'title' in artifact ? artifact.title : '').toContain('(slides)');
  });

  it('lets an explicit keyword in the question override the base artifact scenario', async () => {
    const events = await collect('session-base-2', 'What is the CP Test status?', 'artifact-3');

    // CP Test opens with its own condition form — proof the scenario switched.
    const question = events.find((event) => event.type === 'QUESTION');
    expect(question && 'form' in question ? question.form?.formKey : '').toBe('cptest-conditions');
  });
});
