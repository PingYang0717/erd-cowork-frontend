import React, { useState } from 'react';
import { Select } from 'antd';
import { InfoCircleOutlined, SendOutlined } from '@ant-design/icons';

import { useTranslations } from '@/i18n/useTranslations';
import { useConnectorsPanelStore } from '@/stores/useConnectorsPanelStore';
import type { QuestionAnswer, QuestionField, QuestionForm } from '@/types/api';

import styles from './QuestionFormCard.module.css';

/** Past either of these a chip row stops fitting in the two lines the card allows for it,
 *  and the field is offered as a dropdown instead. Two limits rather than one because a
 *  row grows two ways: more chips, or longer ones. */
const CHIP_MAX_OPTIONS = 5;
const CHIP_MAX_LABEL_LENGTH = 12;

/** How many values the user has picked across the whole form. Drives the submit label
 *  of a form that asks "how many first?" — a narrowing reask counts what it will chart. */
const countAnswers = (answers: Answers): number => {
  return Object.values(answers).reduce<number>((total, answer) => {
    if (Array.isArray(answer)) {
      return total + answer.length;
    }
    return answer === false || answer === '' || answer === undefined ? total : total + 1;
  }, 0);
};

/** Whether this field is offered as a dropdown rather than as a row of chips.
 *
 *  `text` has its own input, and `boolean` is a single switch whose chip IS the value —
 *  a dropdown for either would be a worse control, however long the wording. */
const rendersAsDropdown = (field: QuestionField): boolean => {
  if (field.kind === 'text' || field.kind === 'boolean') {
    return false;
  }
  const options = field.options ?? [];
  return options.length > CHIP_MAX_OPTIONS || options.some((option) => option.label.length > CHIP_MAX_LABEL_LENGTH);
};

export type Answers = Record<string, QuestionAnswer>;

const isVisible = (field: QuestionField, answers: Answers): boolean => {
  if (!field.visibleWhen) {
    return true;
  }
  return answers[field.visibleWhen.field] === field.visibleWhen.equals;
};

const isAnswered = (field: QuestionField, answers: Answers): boolean => {
  const answer = answers[field.key];

  if (Array.isArray(answer)) {
    return answer.length > 0;
  }
  if (typeof answer === 'string') {
    return answer.trim() !== '';
  }
  return answer === true;
};

interface ChipGroupProps {
  field: QuestionField;
  answers: Answers;
  onToggle: (value: string) => void;
}

/** Chips are only ever offered for a handful of short options — anything long enough to
 *  need narrowing is a dropdown, which searches itself — so this shows all of them. */
const ChipGroup: React.FC<ChipGroupProps> = ({ field, answers, onToggle }) => {
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

  const options = field.options ?? [];

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
          {option.label}
        </button>
      ))}
    </div>
  );
};

/** The Data type field is the one place the form points back at the Connectors panel:
 *  its options ARE the connected connectors, so "none of these" is fixed there. */
interface DataTypeHintProps {
  hint: string;
}

const DataTypeHint: React.FC<DataTypeHintProps> = ({ hint }) => {
  const t = useTranslations();
  const openConnectors = useConnectorsPanelStore((store) => store.open);

  return (
    <p className={styles.fieldHint}>
      <InfoCircleOutlined aria-hidden />
      {hint}
      <button type="button" className={styles.manageLink} onClick={openConnectors}>
        {t.chat.manageConnections}
      </button>
    </p>
  );
};

interface QuestionFormCardProps {
  form: QuestionForm;
  onSubmit: (answers: Answers) => void;
  /** Read-only: the reask as it was asked, with nothing to submit. History reasks come
   *  back this way — the answers were never persisted, so the card can only show what
   *  was asked, not what was chosen. */
  disabled?: boolean;
}

/** One reask from the agent: the fields it needs answered before it can carry on.
 *  Which fields appear is the Scenario's contract; what is in `options` is resolved
 *  when the run happens (ADR-0004). */
const QuestionFormCard: React.FC<QuestionFormCardProps> = ({ form, onSubmit, disabled = false }) => {
  const t = useTranslations();

  const [answers, setAnswers] = useState<Answers>({});

  const setFieldText = (field: QuestionField, value: string) => {
    setAnswers((previous) => ({ ...previous, [field.key]: value }));
  };

  const toggle = (field: QuestionField, value: string) => {
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

      return clearDependentsOf(field, next);
    });
  };

  /** Writes a field's whole answer at once — what a dropdown reports, against the chips'
   *  one-value-at-a-time toggling. */
  const setFieldValue = (field: QuestionField, value: QuestionAnswer) => {
    setAnswers((previous) => clearDependentsOf(field, { ...previous, [field.key]: value }));
  };

  // Changing a trigger discards whatever was answered beneath it. Hiding the answer but
  // keeping it would submit a Flow the user can no longer see, under a role it does not
  // belong to. Mutates `next`, which is always a copy the caller just made.
  const clearDependentsOf = (changed: QuestionField, next: Answers): Answers => {
    for (const dependent of form.fields) {
      if (dependent.visibleWhen?.field === changed.key && !isVisible(dependent, next)) {
        delete next[dependent.key];
      }
    }
    return next;
  };

  const selectedCount = countAnswers(answers);
  const submitLabel = form.submitLabel.replace('{count}', String(selectedCount));
  const visibleFields = form.fields.filter((field) => isVisible(field, answers));
  const canSubmit = visibleFields.filter((field) => field.required).every((field) => isAnswered(field, answers));

  return (
    <fieldset className={styles.card} disabled={disabled}>
      <p className={styles.title}>{form.title}</p>
      {form.intro && <p className={styles.intro}>{form.intro}</p>}

      {visibleFields.map((field) => {
        const options = field.options ?? [];
        const asDropdown = rendersAsDropdown(field);
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

            {field.kind === 'text' ? (
              <input
                aria-label={field.label}
                placeholder={field.placeholder}
                value={typeof answer === 'string' ? answer : ''}
                className={styles.textInput}
                onChange={(event) => setFieldText(field, event.target.value)}
              />
            ) : asDropdown ? (
              <Select
                // An id of its own rather than one from rc-util's `useId`, which returns a
                // constant under test: a second component asking for one gets the same
                // string, and any `aria-labelledby` pointing at it then resolves to
                // whichever element comes first in the document. The Connectors dialog
                // lost its accessible name that way.
                id={`question-${form.formKey}-${field.key}`}
                aria-label={field.label}
                mode={field.kind === 'multi' ? 'multiple' : undefined}
                // Same reason ShareArtifactDialog turns it off: the virtual list renders a
                // window of rows and drops each one's `title`, so a row is neither fully
                // present for assistive tech nor findable by the name it reads as.
                virtual={false}
                // The card sits in a thread pane the reader can narrow to a column; a
                // dropdown that keeps its own width would push the conversation sideways.
                className={styles.select}
                placeholder={field.placeholder}
                showSearch
                optionFilterProp="label"
                value={
                  field.kind === 'multi' ? ((answer as string[] | undefined) ?? []) : ((answer as string) ?? undefined)
                }
                onChange={(value: string | string[]) => setFieldValue(field, value)}
                // `title` mirrors the label rather than carrying the option's hint: antd
                // uses it for the row's tooltip AND as its accessible fallback, so a hint
                // there would make the row announce something other than what it reads as.
                // The hint is a chip-only affordance — a dropdown row has no room beside
                // its text for one.
                options={options.map((option) => ({
                  value: option.value,
                  label: option.label,
                  title: option.label,
                }))}
              />
            ) : (
              <ChipGroup field={field} answers={answers} onToggle={(value) => toggle(field, value)} />
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

      {/* A read-only card has nothing to submit; the footer would only offer a dead
          button next to a hint about a decision that is already made. */}
      {!disabled && (
        <div className={styles.footer}>
          <button type="button" className={styles.submit} disabled={!canSubmit} onClick={() => onSubmit(answers)}>
            <SendOutlined aria-hidden />
            {submitLabel}
          </button>
          <span className={styles.disabledHint}>
            {canSubmit ? t.chat.selectedCount(selectedCount) : form.disabledHint}
          </span>
        </div>
      )}
    </fieldset>
  );
};

export default QuestionFormCard;
