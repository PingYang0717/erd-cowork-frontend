import { describe, expect, it } from 'vitest';

import { liftQuestions } from './liftQuestions';

describe('liftQuestions', () => {
  it('lifts the backend flat question list into a renderable form', () => {
    const form = liftQuestions([
      { text: 'Which lots?', options: ['PT-01', 'PT-07'], multiSelect: true },
      { text: 'Time range?', options: ['Last 7 days'], multiSelect: false },
    ]);

    expect(form.fields).toEqual([
      {
        key: 'q0',
        label: 'Which lots?',
        kind: 'multi',
        required: true,
        options: [
          { value: 'PT-01', label: 'PT-01' },
          { value: 'PT-07', label: 'PT-07' },
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
    expect(form.formKey).toBe('backend-question');
  });
});
