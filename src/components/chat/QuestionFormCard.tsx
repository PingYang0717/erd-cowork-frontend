import React, { useState } from 'react';
import { Select } from 'antd';
import { InfoCircleOutlined, SendOutlined } from '@ant-design/icons';

import { useTranslations } from '@/i18n/useTranslations';
import { useConnectorsPanelStore } from '@/stores/useConnectorsPanelStore';
import type { QuestionAnswer, QuestionField, QuestionForm } from '@/types/api';
import { DEFAULT_LIST_HEIGHT, listHeightUnder } from '@/utils/dropdownListHeight';

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

/** What the reader picked and what they typed, as one answer per field.
 *
 *  Only a `multi` field holds both: it can carry several options and one value of its own.
 *  A `single` field's typed value stands instead of a pick — there is one slot — and a
 *  `text` field has nothing to pick at all. */
const mergeAnswers = (form: QuestionForm, picks: Answers, texts: Record<string, string>): Answers => {
  const merged: Answers = { ...picks };

  for (const field of form.fields) {
    const typed = (texts[field.key] ?? '').trim();
    if (field.kind === 'boolean') {
      continue;
    }
    if (field.kind === 'text' || field.kind !== 'multi') {
      if (typed !== '') {
        merged[field.key] = typed;
      }
      continue;
    }
    const picked = pickedOptionsOf(field, picks[field.key]);
    merged[field.key] = typed === '' || picked.includes(typed) ? picked : [...picked, typed];
  }

  return merged;
};

/** The part of an answer no option accounts for — what the reader typed rather than
 *  picked. One per field: the box holds a value, not a list of them.
 *
 *  A multi field keeps it inside the array with the picked options, so typing adds to the
 *  answer instead of replacing it. Writing the string over the array (which is what a
 *  plain text field does) threw away every option already chosen. */
const customValueOf = (field: QuestionField, answer: QuestionAnswer | undefined): string => {
  const isOption = (value: string) => (field.options ?? []).some((option) => option.value === value);
  if (field.kind === 'multi') {
    return (Array.isArray(answer) ? answer : []).find((value) => !isOption(value)) ?? '';
  }
  return typeof answer === 'string' && answer !== '' && !isOption(answer) ? answer : '';
};

/** What the list itself shows as chosen: the options, never the typed value. The typed
 *  value has its own box below — showing it in both says the same answer twice, and for a
 *  single select antd would render it as though it were an option that exists. */
const pickedOptionsOf = (field: QuestionField, answer: QuestionAnswer | undefined): string[] => {
  const isOption = (value: string) => (field.options ?? []).some((option) => option.value === value);
  if (field.kind === 'multi') {
    return (Array.isArray(answer) ? answer : []).filter(isOption);
  }
  return typeof answer === 'string' && isOption(answer) ? [answer] : [];
};

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
  /** Read-only: the reask as it was asked, with nothing to submit. */
  disabled?: boolean;
  /** What was chosen, for a card showing a past reask. Read back out of the answer the
   *  reader sent (`parseAnswerText`), because nothing persists the answers themselves.
   *  Read on every render, not only the first: a read-only card is drawn before the reply
   *  it is recovered from has been refetched. */
  answered?: Answers;
}

/** One reask from the agent: the fields it needs answered before it can carry on.
 *  Which fields appear is the Scenario's contract; what is in `options` is resolved
 *  when the run happens (ADR-0004). */
const QuestionFormCard: React.FC<QuestionFormCardProps> = ({ form, onSubmit, disabled = false, answered }) => {
  const t = useTranslations();

  /** What was picked from the list, and what was typed beside it, held apart.
   *
   *  Deriving the typed part from the answer — "the value no option accounts for" — reads
   *  the wrong thing the moment what is being typed passes through an option's own label:
   *  typing `A14-9999` where `A14` is an option meant the third keystroke was absorbed as
   *  a pick and the box reset, leaving `-9999`. They are two inputs; they are stored as
   *  two, and `answers` below is what they add up to. */
  const [editedPicks, setEditedPicks] = useState<Answers>({});
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});

  // Only one list is open at a time, so one measurement serves every field on the card.
  const [listHeight, setListHeight] = useState(DEFAULT_LIST_HEIGHT);

  // Changing a trigger discards whatever was answered beneath it. Hiding the answer but
  // keeping it would submit a Flow the user can no longer see, under a role it does not
  // belong to. Mutates `next`, which is always a copy the caller just made.
  const clearDependentsOf = (changed: QuestionField, next: Answers): Answers => {
    for (const dependent of form.fields) {
      if (dependent.visibleWhen?.field === changed.key && !isVisible(dependent, next)) {
        delete next[dependent.key];
        // The typed half goes with it: a field that is no longer shown must not submit
        // what was typed into it before its trigger changed.
        setEditedTexts((texts) => {
          const { [dependent.key]: _dropped, ...rest } = texts;
          return rest;
        });
      }
    }
    return next;
  };

  /** Writes what the reader typed. Only that: what they picked from the list is a
   *  separate store, so the box beside a list adds to the answer rather than standing in
   *  for it. */
  const setFieldText = (field: QuestionField, value: string) => {
    setEditedTexts((previous) => ({ ...previous, [field.key]: value }));
  };

  const toggle = (field: QuestionField, value: string) => {
    setEditedPicks((previous) => {
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
    setEditedPicks((previous) => clearDependentsOf(field, { ...previous, [field.key]: value }));
  };

  // A read-only card has nothing to edit, so it renders from what it was given rather
  // than from state. `useState` reads its argument once, on mount — and these answers
  // arrive later than that: they are recovered from the reply, which lands with the
  // history refetch after the card is already on screen. Held in state, the card sat
  // there empty until something remounted it, which in practice meant reloading the page.
  //
  // Editing, the two stores add up: what was picked plus what was typed. `text` fields
  // have nothing to pick, and a `single` field's typed answer stands instead of a pick —
  // only a `multi` field carries both at once.
  const answers = disabled ? (answered ?? {}) : mergeAnswers(form, editedPicks, editedTexts);

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
        const customValue = disabled ? customValueOf(field, answer) : (editedTexts[field.key] ?? '');
        const isCustom = customValue !== '';

        return (
          <div key={field.key} className={styles.field}>
            <p className={styles.fieldLabel}>{field.label}</p>

            {field.kind === 'text' ? (
              <input
                aria-label={field.label}
                placeholder={field.placeholder}
                value={disabled ? (typeof answer === 'string' ? answer : '') : (editedTexts[field.key] ?? '')}
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
                // Its own flag, not just the fieldset's. antd opens the list from the
                // wrapper it draws around the input, and draws a tag's remove `×` as a
                // span — a disabled fieldset reaches neither. A settled card would still
                // drop its list open, and show a control that looks like it takes the
                // answer back.
                disabled={disabled}
                // The card sits in a thread pane the reader can narrow to a column; a
                // dropdown that keeps its own width would push the conversation sideways.
                className={styles.select}
                classNames={{ popup: { root: styles.selectPopup } }}
                // Measured when it opens, from the trigger down to the edge of the
                // conversation — see `listHeightUnder`. antd's own fit test is against the
                // viewport, which the thread is only a fraction of.
                listHeight={listHeight}
                onOpenChange={(open) => {
                  if (open) {
                    setListHeight(listHeightUnder(document.getElementById(`question-${form.formKey}-${field.key}`)));
                  }
                }}
                placeholder={field.placeholder}
                showSearch
                optionFilterProp="label"
                // Only what was picked from the list. The typed answer lives in the box
                // below, so feeding it in here would show it twice — and a single select
                // would render it as though it were an option that exists.
                value={
                  field.kind === 'multi'
                    ? pickedOptionsOf(field, answer)
                    : (pickedOptionsOf(field, answer)[0] ?? undefined)
                }
                // Picks only. What was typed lives in its own store and is merged back
                // in by `mergeAnswers`, so the list never has to carry it.
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

            {/* On a settled card the box is only there when it holds the answer: an
                empty input under a question already answered is a control that does
                nothing, on a card that can do nothing. */}
            {/* The one place anything is typed, whatever the list above it is. A control
                that picks and a control that types are different things, and a reader
                should not have to discover that one of them quietly does both. */}
            {field.allowCustom && (!disabled || isCustom) && (
              <input
                aria-label={field.label}
                // Its own wording, not the field's: `placeholder` belongs to the control
                // the field is primarily rendered as — the list, or the text box when
                // there is no list. This one is always the same thing.
                placeholder={t.chat.questionCustomPlaceholder}
                value={customValue}
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
