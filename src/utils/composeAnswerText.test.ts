import { describe, expect, it } from 'vitest';

import type { QuestionForm } from '@/types/api/agentEvent';
import { composeAnswerText, parseAnswerText } from './composeAnswerText';

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
