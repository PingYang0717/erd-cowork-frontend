import { describe, expect, it } from 'vitest';

import type { QuestionForm } from '@/types/api/agentEvent';

import { composeAnswerText } from './composeAnswerText';

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
        { value: 'PT-01', label: 'PT-01' },
        { value: 'PT-07', label: 'PT-07' },
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
    expect(composeAnswerText(form, { partIds: ['PT-01', 'PT-07'], timeRange: 'cp7d' })).toBe(
      'Part ID：PT-01、PT-07；Time range：近 7 天',
    );
  });

  it('keeps a custom value the options do not know verbatim', () => {
    expect(composeAnswerText(form, { timeRange: '07/01–07/31' })).toBe('Time range：07/01–07/31');
  });

  it('renders a true boolean as its option label and skips a false one', () => {
    expect(composeAnswerText(form, { mineOnly: true })).toBe('檢視：只看我送測的 (王小明)');
    expect(composeAnswerText(form, { mineOnly: false, timeRange: 'cp7d' })).toBe(
      'Time range：近 7 天',
    );
  });

  it('skips fields hidden by visibleWhen even if they somehow carry an answer', () => {
    expect(composeAnswerText(form, { flow: 'FEOL', timeRange: 'cp7d' })).toBe(
      'Time range：近 7 天',
    );
  });

  it('skips unanswered fields entirely', () => {
    expect(composeAnswerText(form, {})).toBe('');
  });
});
