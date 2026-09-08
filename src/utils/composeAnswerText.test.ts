import { describe, expect, it } from 'vitest';

import type { QuestionForm } from '@/types/api/agentEvent';
import { composeAnswerText, parseAnswerText } from './composeAnswerText';
import { liftQuestions } from './liftQuestions';

const form: QuestionForm = {
  formKey: 'spc-conditions',
  title: '分析條件',
  fields: [
    {
      key: 'partIds',
      label: 'Part ID',
      kind: 'multi',
      required: true,
      options: [
        { value: 'A14', label: 'A14' },
        { value: 'N5', label: 'N5' },
      ],
    },
    {
      key: 'timeRange',
      label: 'Time range',
      kind: 'single',
      required: true,
      options: [{ value: 'cp7d', label: '近 7 天' }],
      allowCustom: true,
    },
    {
      key: 'flow',
      label: 'Flow',
      kind: 'single',
      required: false,
      options: [{ value: 'FEOL', label: 'FEOL' }],
      visibleWhen: { field: 'role', equals: 'baseline' },
    },
    {
      key: 'mineOnly',
      label: '檢視',
      kind: 'boolean',
      required: false,
      options: [{ value: 'mineOnly', label: '只看我送測的 (王小明)' }],
    },
  ],
  submitLabel: '送出',
  disabledHint: '',
  summaryLabel: '分析條件',
};

describe('composeAnswerText', () => {
  it('joins answered fields as label：value pairs, mapping values to option labels', () => {
    expect(composeAnswerText(form, { partIds: ['A14', 'N5'], timeRange: 'cp7d' })).toBe(
      'Part ID：A14、N5；Time range：近 7 天'
    );
  });

  it('keeps a custom value the options do not know verbatim', () => {
    expect(composeAnswerText(form, { timeRange: '07/01–07/31' })).toBe('Time range：07/01–07/31');
  });

  it('renders a true boolean as its option label and skips a false one', () => {
    expect(composeAnswerText(form, { mineOnly: true })).toBe('檢視：只看我送測的 (王小明)');
    expect(composeAnswerText(form, { mineOnly: false, timeRange: 'cp7d' })).toBe('Time range：近 7 天');
  });

  it('skips fields hidden by visibleWhen even if they somehow carry an answer', () => {
    expect(composeAnswerText(form, { flow: 'FEOL', timeRange: 'cp7d' })).toBe('Time range：近 7 天');
  });

  it('skips unanswered fields entirely', () => {
    expect(composeAnswerText(form, {})).toBe('');
  });
});

/** The inverse. It exists because nothing stores the answers: the sentence composed above
 *  is the only record, so a past reask can only show what was chosen by reading it back. */
describe('parseAnswerText', () => {
  it('round-trips what composeAnswerText wrote', () => {
    const answers = { partIds: ['A14', 'N5'], timeRange: 'cp7d' };

    expect(parseAnswerText(form, composeAnswerText(form, answers))).toEqual(answers);
  });

  it('keeps a custom value the options do not know, so the card shows it typed in', () => {
    expect(parseAnswerText(form, 'Time range：07/01–07/31')).toEqual({ timeRange: '07/01–07/31' });
  });

  it('reads a boolean back as on — the sentence only ever carries it when it was', () => {
    expect(parseAnswerText(form, composeAnswerText(form, { mineOnly: true }))).toEqual({ mineOnly: true });
  });

  it('is null for a message that was not an answer to this form at all', () => {
    expect(parseAnswerText(form, 'actually, forget that — show me A16 yields')).toBeNull();
    expect(parseAnswerText(form, '')).toBeNull();
  });

  /** A partial parse of a real answer beats an empty card, so one matched label is enough
   *  and labels this form does not know are passed over rather than failing the whole. */
  it('takes the fields it recognises and ignores the rest', () => {
    expect(parseAnswerText(form, 'Part ID：A14；Something else：42')).toEqual({ partIds: ['A14'] });
  });
});

/** The sentence is prose written for the backend to read, not a format — and the labels
 *  in it are the backend's own question text. Splitting on the separators tore those in
 *  half: a question with a colon in it lost its whole field, which on screen read as
 *  "the chips remember what I picked but the dropdowns do not" — the longer questions are
 *  exactly the ones rendered as dropdowns. Anchored on whole labels instead. */
describe('parseAnswerText against the shapes a real backend sends', () => {
  it('reads a field back whose question text carries a colon of its own', () => {
    const form = liftQuestions([
      { text: 'Part ID', options: ['A14', 'A16'], multiSelect: false },
      { text: '資料量偏大：要先看哪幾個 Lot', options: ['L1', 'L2', 'L3'], multiSelect: true },
    ]);
    const answers = { q0: 'A14', q1: ['L1', 'L3'] };

    expect(parseAnswerText(form, composeAnswerText(form, answers))).toEqual(answers);
  });

  it('reads a field back whose question text carries the field separator', () => {
    const form = liftQuestions([{ text: '要先看哪幾個 Lot；可複選', options: ['L1', 'L2'], multiSelect: true }]);
    const answers = { q0: ['L1'] };

    expect(parseAnswerText(form, composeAnswerText(form, answers))).toEqual(answers);
  });

  it('keeps an option whole whose own label carries the value separator', () => {
    const form = liftQuestions([{ text: 'Scope', options: ['整段 flow、含 loop', 'FEOL only'], multiSelect: true }]);
    const answers = { q0: ['整段 flow、含 loop'] };

    expect(parseAnswerText(form, composeAnswerText(form, answers))).toEqual(answers);
  });

  /** One label sitting inside another. The longer mark is the real one — a hit that starts
   *  inside another label's own text is that label, not a field of its own. */
  it('does not let a short label match inside a longer one', () => {
    const form = liftQuestions([
      { text: 'Lot scope', options: ['all', 'first three'], multiSelect: false },
      { text: 'Lot', options: ['L1', 'L2'], multiSelect: false },
    ]);
    const answers = { q0: 'all', q1: 'L2' };

    expect(parseAnswerText(form, composeAnswerText(form, answers))).toEqual(answers);
  });

  /** A misread must leave a field blank, never light up an option nobody picked: a value
   *  is either an option this form offers or text kept verbatim. */
  it('does not let an option claim an answer it is merely a prefix of', () => {
    const form = liftQuestions([{ text: 'Part ID', options: ['A14'], multiSelect: false }]);

    expect(parseAnswerText(form, 'Part ID：A14X')).toEqual({ q0: 'A14X' });
  });
});
