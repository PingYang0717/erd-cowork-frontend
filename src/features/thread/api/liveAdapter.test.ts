import { describe, expect, it } from 'vitest';

import { type BackendMessage, toAgentEvent, toMessage, toQuestionForm } from './liveAdapter';

const backendMessage: BackendMessage = {
  id: 'm1',
  sender: 'AI',
  text: 'Done — recomputed control limits.',
  stepsJson: '[{"stepKey":"1","title":"Connect","description":null,"status":"SUCCESS"}]',
  artifactId: 'artifact-9',
  createdAt: '2026-08-25T01:00:00Z',
  artifactTitle: 'SPC analysis — Vt (gate CD)',
  questionsJson: null,
};

describe('live backend adapter', () => {
  it('turns the backend message shape into the one the UI reads', () => {
    expect(toMessage(backendMessage, 'session-1')).toEqual({
      id: 'm1',
      sessionId: 'session-1',
      role: 'ai',
      text: 'Done — recomputed control limits.',
      steps: [{ stepKey: '1', title: 'Connect', description: null, status: 'SUCCESS' }],
      artifactId: 'artifact-9',
      artifactName: 'SPC analysis — Vt (gate CD)',
    });
  });

  it('survives a stepsJson the backend could not serialise', () => {
    const message = toMessage({ ...backendMessage, stepsJson: '[{"stepKey":' }, 'session-1');

    expect(message.steps).toBeUndefined();
    expect(message.text).toBe('Done — recomputed control limits.');
  });

  it('lifts the backend flat question list into a renderable form', () => {
    const form = toQuestionForm([
      { text: 'Which lots?', options: ['A14', 'N5'], multiSelect: true },
      { text: 'Time range?', options: ['Last 7 days'], multiSelect: false },
    ]);

    expect(form.fields).toEqual([
      {
        key: 'q0',
        label: 'Which lots?',
        kind: 'multi',
        required: true,
        options: [
          { value: 'A14', label: 'A14' },
          { value: 'N5', label: 'N5' },
        ],
      },
      {
        key: 'q1',
        label: 'Time range?',
        kind: 'single',
        required: true,
        options: [{ value: 'Last 7 days', label: 'Last 7 days' }],
      },
    ]);
  });

  it('normalises a QUESTION event and leaves every other event untouched', () => {
    expect(
      toAgentEvent({
        type: 'QUESTION',
        questions: [{ text: 'Which lots?', options: ['A14'], multiSelect: false }],
      }),
    ).toMatchObject({ type: 'QUESTION', form: { fields: [{ label: 'Which lots?' }] } });

    const token = { type: 'TOKEN', delta: 'Vt ' } as const;
    expect(toAgentEvent(token)).toBe(token);
  });
});
