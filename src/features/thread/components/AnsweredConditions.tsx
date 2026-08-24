import { CheckCircleFilled, DownOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';

import type { QuestionAnswer, QuestionForm } from '@/types/api';

import styles from './AnsweredConditions.module.css';

function answerLabels(form: QuestionForm, answers: Record<string, QuestionAnswer>): string[] {
  const labels: string[] = [];

  for (const field of form.fields) {
    const answer = answers[field.key];
    if (answer === undefined || answer === false || answer === '') {
      continue;
    }

    // A boolean field's answer is the field being on, so its single option is the label.
    if (answer === true) {
      labels.push(field.options?.[0]?.label ?? field.label);
      continue;
    }

    const values = Array.isArray(answer) ? answer : [String(answer)];
    for (const value of values) {
      // A value the field offered shows its label; a custom one shows as typed.
      const option = field.options?.find((candidate) => candidate.value === value);
      labels.push(option?.label ?? value);
    }
  }

  return labels;
}

/** What the user set in a reask, once the run has moved on. The form itself is gone by
 *  then — answering starts the next run — so this reads from the persisted message. */
export function AnsweredConditions({
  form,
  answers,
}: {
  form: QuestionForm;
  answers: Record<string, QuestionAnswer>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const labels = answerLabels(form, answers);

  return (
    <div className={styles.card}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <CheckCircleFilled aria-hidden className={styles.check} />
        <span>
          已設定 <span className={styles.count}>{labels.length} 項</span> {form.summaryLabel}
        </span>
        {isExpanded ? (
          <DownOutlined aria-hidden className={styles.chevron} />
        ) : (
          <RightOutlined aria-hidden className={styles.chevron} />
        )}
      </button>
      {isExpanded && (
        <ul className={styles.values} aria-label={form.summaryLabel}>
          {labels.map((label) => (
            <li key={label} className={styles.value}>
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
