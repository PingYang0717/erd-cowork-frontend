import { InfoCircleOutlined, SendOutlined } from '@ant-design/icons';
import { useState } from 'react';

import { useConnectorsPanelStore } from '@/features/connectors/store/useConnectorsPanelStore';
import type { QuestionAnswer, QuestionField, QuestionForm } from '@/types/api';

import styles from './QuestionFormCard.module.css';

/** Above this many options a field gets a search box rather than a wall of chips. */
const SEARCHABLE_FROM = 4;

/** How many values the user has picked across the whole form. Drives the submit label
 *  of a form that asks "how many first?" — the DC item reask counts what it will chart. */
function countAnswers(answers: Answers): number {
  return Object.values(answers).reduce<number>((total, answer) => {
    if (Array.isArray(answer)) {
      return total + answer.length;
    }
    return answer === false || answer === '' || answer === undefined ? total : total + 1;
  }, 0);
}

/** A chip's label carries its spec limits when the field has them, so an engineer can
 *  judge an item without opening anything. */
function optionLabel(option: { label: string; unit?: string; lo?: number; hi?: number }): string {
  if (option.lo === undefined || option.hi === undefined || option.unit === undefined) {
    return option.label;
  }
  if (option.unit === '') {
    return option.label;
  }
  return `${option.label} · ${option.lo} – ${option.hi} ${option.unit}`;
}

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
  search,
  onToggle,
}: {
  field: QuestionField;
  answers: Answers;
  search: string;
  onToggle: (value: string) => void;
}) {
  const selected = answers[field.key];
  const isSelected = (value: string) => {
    if (Array.isArray(selected)) {
      return selected.includes(value);
    }
    // A boolean field has exactly one chip, and the chip IS the field's value.
    if (field.kind === 'boolean') {
      return selected === true;
    }
    return selected === value;
  };

  const needle = search.trim().toLowerCase();
  const options = (field.options ?? []).filter(
    (option) => needle === '' || option.label.toLowerCase().includes(needle),
  );

  return (
    <div className={styles.chipRow} role="group" aria-label={field.label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={isSelected(option.value)}
          title={option.hint}
          className={isSelected(option.value) ? styles.chipSelected : styles.chip}
          onClick={() => onToggle(option.value)}
        >
          {optionLabel(option)}
        </button>
      ))}
    </div>
  );
}

/** The Data type field is the one place the form points back at the Connectors panel:
 *  its options ARE the connected connectors, so "none of these" is fixed there. */
function DataTypeHint({ hint }: { hint: string }) {
  const openConnectors = useConnectorsPanelStore((store) => store.open);

  return (
    <p className={styles.fieldHint}>
      <InfoCircleOutlined aria-hidden />
      {hint}
      <button type="button" className={styles.manageLink} onClick={openConnectors}>
        管理連線
      </button>
    </p>
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
  const [searches, setSearches] = useState<Record<string, string>>({});

  function setFieldText(field: QuestionField, value: string) {
    setAnswers((previous) => ({ ...previous, [field.key]: value }));
  }

  function toggle(field: QuestionField, value: string) {
    setAnswers((previous) => {
      const next: Answers =
        field.kind === 'boolean'
          ? { ...previous, [field.key]: previous[field.key] !== true }
          : field.kind === 'multi'
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

  const selectedCount = countAnswers(answers);
  const submitLabel = form.submitLabel.replace('{count}', String(selectedCount));
  const visibleFields = form.fields.filter((field) => isVisible(field, answers));
  const canSubmit = visibleFields
    .filter((field) => field.required)
    .every((field) => isAnswered(field, answers));

  return (
    <div className={styles.card}>
      <p className={styles.title}>{form.title}</p>
      {form.intro && <p className={styles.intro}>{form.intro}</p>}

      {visibleFields.map((field) => {
        const options = field.options ?? [];
        const isSearchable =
          (field.kind === 'multi' || field.kind === 'dcitem') && options.length > SEARCHABLE_FROM;
        const answer = answers[field.key];
        // A typed value that no chip offers — the mockup highlights the input for it.
        const isCustom =
          field.allowCustom &&
          typeof answer === 'string' &&
          answer !== '' &&
          !options.some((option) => option.value === answer);

        return (
          <div key={field.key} className={styles.field}>
            <p className={styles.fieldLabel}>{field.label}</p>

            {isSearchable && (
              <input
                aria-label={`搜尋 ${field.label}`}
                placeholder={field.placeholder}
                value={searches[field.key] ?? ''}
                className={styles.searchInput}
                onChange={(event) =>
                  setSearches((previous) => ({ ...previous, [field.key]: event.target.value }))
                }
              />
            )}

            {field.kind === 'text' ? (
              <input
                aria-label={field.label}
                placeholder={field.placeholder}
                value={typeof answer === 'string' ? answer : ''}
                className={styles.textInput}
                onChange={(event) => setFieldText(field, event.target.value)}
              />
            ) : (
              <ChipGroup
                field={field}
                answers={answers}
                search={isSearchable ? (searches[field.key] ?? '') : ''}
                onToggle={(value) => toggle(field, value)}
              />
            )}

            {field.allowCustom && (
              <input
                aria-label={field.label}
                placeholder={field.customPlaceholder ?? field.placeholder}
                value={isCustom ? String(answer) : ''}
                className={isCustom ? styles.customInputActive : styles.customInput}
                onChange={(event) => setFieldText(field, event.target.value)}
              />
            )}

            {field.hint && <DataTypeHint hint={field.hint} />}
          </div>
        );
      })}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.submit}
          disabled={!canSubmit}
          onClick={() => onSubmit(answers)}
        >
          <SendOutlined aria-hidden />
          {submitLabel}
        </button>
        <span className={styles.disabledHint}>
          {canSubmit ? `已選 ${selectedCount} 項` : form.disabledHint}
        </span>
      </div>
    </div>
  );
}
