import { SendOutlined } from '@ant-design/icons';
import { useState } from 'react';

import type { QuestionAnswer, QuestionField, QuestionForm } from '@/types/api';

import styles from './QuestionFormCard.module.css';

export type Answers = Record<string, QuestionAnswer>;

function isVisible(field: QuestionField, answers: Answers): boolean {
  if (!field.visibleWhen) {
    return true;
  }
  return answers[field.visibleWhen.field] === field.visibleWhen.equals;
}

function isAnswered(field: QuestionField, answers: Answers): boolean {
  const answer = answers[field.key];

  if (Array.isArray(answer)) {
    return answer.length > 0;
  }
  if (typeof answer === 'string') {
    return answer.trim() !== '';
  }
  return answer === true;
}

function ChipGroup({
  field,
  answers,
  onToggle,
}: {
  field: QuestionField;
  answers: Answers;
  onToggle: (value: string) => void;
}) {
  const selected = answers[field.key];
  const isSelected = (value: string) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  return (
    <div className={styles.chipRow} role="group" aria-label={field.label}>
      {(field.options ?? []).map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={isSelected(option.value)}
          className={isSelected(option.value) ? styles.chipSelected : styles.chip}
          onClick={() => onToggle(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** One reask from the agent: the fields it needs answered before it can carry on.
 *  Which fields appear is the Scenario's contract; what is in `options` is resolved
 *  when the run happens (ADR-0006). */
export function QuestionFormCard({
  form,
  onSubmit,
}: {
  form: QuestionForm;
  onSubmit: (answers: Answers) => void;
}) {
  const [answers, setAnswers] = useState<Answers>({});

  function toggle(field: QuestionField, value: string) {
    setAnswers((previous) => {
      const next: Answers =
        field.kind === 'multi'
          ? (() => {
              const current = (previous[field.key] as string[] | undefined) ?? [];
              return {
                ...previous,
                [field.key]: current.includes(value)
                  ? current.filter((entry) => entry !== value)
                  : [...current, value],
              };
            })()
          : { ...previous, [field.key]: value };

      // Changing a trigger discards whatever was answered beneath it. Hiding the answer
      // but keeping it would submit a Flow the user can no longer see, under a role it
      // does not belong to.
      for (const dependent of form.fields) {
        if (dependent.visibleWhen?.field === field.key && !isVisible(dependent, next)) {
          delete next[dependent.key];
        }
      }

      return next;
    });
  }

  const visibleFields = form.fields.filter((field) => isVisible(field, answers));
  const canSubmit = visibleFields
    .filter((field) => field.required)
    .every((field) => isAnswered(field, answers));

  return (
    <div className={styles.card}>
      <p className={styles.title}>{form.title}</p>
      {form.intro && <p className={styles.intro}>{form.intro}</p>}

      {visibleFields.map((field) => (
        <div key={field.key} className={styles.field}>
          <p className={styles.fieldLabel}>{field.label}</p>
          <ChipGroup field={field} answers={answers} onToggle={(value) => toggle(field, value)} />
        </div>
      ))}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.submit}
          disabled={!canSubmit}
          onClick={() => onSubmit(answers)}
        >
          <SendOutlined aria-hidden />
          {form.submitLabel}
        </button>
        {!canSubmit && <span className={styles.disabledHint}>{form.disabledHint}</span>}
      </div>
    </div>
  );
}
