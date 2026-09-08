import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/en';
import { liftQuestions } from './liftQuestions';

describe('liftQuestions', () => {
  it('lifts the backend flat question list into a renderable form', () => {
    const form = liftQuestions([
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
        allowCustom: true,
        placeholder: en.chat.questionSelectPlaceholder,
      },
      {
        key: 'q1',
        label: 'Time range?',
        kind: 'single',
        required: true,
        options: [{ value: 'Last 7 days', label: 'Last 7 days' }],
        allowCustom: true,
        placeholder: en.chat.questionSelectPlaceholder,
      },
    ]);
    expect(form.formKey).toBe('backend-question');
  });

  /** What the backend lists is what its model guessed the answer might be, and guessing
   *  short is the normal case. Without a box beside the options the reader can only answer
   *  inside the guess — and the wire has no way for the backend to say "these are the only
   *  acceptable answers", so assuming it did was the client inventing a restriction. */
  it('offers a box beside the options, since the list is a guess', () => {
    const [field] = liftQuestions([{ text: 'Which lots?', options: ['A14'], multiSelect: false }]).fields;

    expect(field.allowCustom).toBe(true);
    // The list's own wording. The box beside it has its own, fixed in the card.
    expect(field.placeholder).toBe(en.chat.questionSelectPlaceholder);
  });

  /** No options is the backend asking an open question. It used to lift into a choice
   *  with nothing to choose: an empty row, no input, and a Submit disabled for good —
   *  the reader was asked something they had no way to answer. */
  it('makes an open question a text field rather than a choice with no choices', () => {
    const [field] = liftQuestions([{ text: 'Describe the range', options: [], multiSelect: false }]).fields;

    expect(field.kind).toBe('text');
    expect(field.options).toBeUndefined();
    expect(field.required).toBe(true);
  });
});
