import type { QuestionAnswer, QuestionField, QuestionForm } from '@/types/api/agentEvent';

/** The backend's message body is question-only (`{ question, baseArtifactId? }`), so a
 *  form's answers go back as one prose sentence — the same shape cowork-master's
 *  ChatPanel sends. Values map to their option labels so the sentence reads the way the
 *  form did; the structured `{ answers, inReplyTo }` wire is on the backend feedback
 *  list, not in the contract. */
/** The three separators the sentence is built from. Named because `parseAnswerText` below
 *  has to take it apart again on exactly the same marks — the round trip is what lets a
 *  past reask show what was chosen, and a change to one direction that missed the other
 *  would break it silently. */
const FIELD_SEPARATOR = '；';
const LABEL_SEPARATOR = '：';
const VALUE_SEPARATOR = '、';

export const composeAnswerText = (form: QuestionForm, answers: Record<string, QuestionAnswer>): string => {
  const parts: string[] = [];

  for (const field of form.fields) {
    if (!isVisible(field, answers)) {
      continue;
    }
    const display = displayValue(field, answers[field.key]);
    if (display !== null) {
      parts.push(`${field.label}${LABEL_SEPARATOR}${display}`);
    }
  }

  return parts.join(FIELD_SEPARATOR);
};

/** Reads a composed answer back into the form's own values.
 *
 *  This is the only way a past reask can show what was chosen. The answers are not stored
 *  anywhere — no `answersJson` on the wire, and the structured `{ answers, inReplyTo }`
 *  channel is on the backend feedback list, not in the contract — so the sentence the user
 *  sent IS the record of them. It is sitting in the thread already, as the USER message
 *  right after the card.
 *
 *  Returns null when the text is not an answer to this form: a reader who ignored a reask
 *  and typed something else leaves an ordinary message in exactly the same position, and
 *  reading that as answers would put words in their mouth. One matched field label is
 *  enough — a partial parse of a real answer beats showing an empty card.
 *
 *  Lossy where the answer itself contained a separator (a free-text field the reader typed
 *  a `；` into). That field comes back truncated; the rest still read correctly. */
export const parseAnswerText = (form: QuestionForm, text: string): Record<string, QuestionAnswer> | null => {
  const fieldsByLabel = new Map(form.fields.map((field) => [field.label, field]));
  const answers: Record<string, QuestionAnswer> = {};

  for (const part of text.split(FIELD_SEPARATOR)) {
    const split = part.indexOf(LABEL_SEPARATOR);
    if (split === -1) {
      continue;
    }
    const field = fieldsByLabel.get(part.slice(0, split).trim());
    if (!field) {
      continue;
    }
    const display = part.slice(split + LABEL_SEPARATOR.length).trim();
    if (display === '') {
      continue;
    }
    answers[field.key] = answerFor(field, display);
  }

  return Object.keys(answers).length > 0 ? answers : null;
};

const answerFor = (field: QuestionField, display: string): QuestionAnswer => {
  // A boolean only ever reaches the sentence when it was switched on — `displayValue`
  // drops it otherwise — so its presence is the answer.
  if (field.kind === 'boolean') {
    return true;
  }
  const values = display.split(VALUE_SEPARATOR).map((label) => optionValue(field, label.trim()));
  return field.kind === 'multi' ? values : values[0];
};

/** Back to the value the form works in. A label with no option behind it is kept as-is:
 *  that is what an `allowCustom` field's typed answer looks like, and the card renders it
 *  in the custom input exactly as it would have during the run. */
const optionValue = (field: QuestionField, label: string): string =>
  field.options?.find((option) => option.label === label)?.value ?? label;

const isVisible = (field: QuestionField, answers: Record<string, QuestionAnswer>): boolean => {
  if (!field.visibleWhen) {
    return true;
  }
  return answers[field.visibleWhen.field] === field.visibleWhen.equals;
};

const displayValue = (field: QuestionField, answer: QuestionAnswer | undefined): string | null => {
  if (answer === undefined || answer === false || answer === '') {
    return null;
  }
  if (answer === true) {
    // A switched-on boolean reads as the thing it switched on.
    return field.options?.[0]?.label ?? field.label;
  }
  const values = Array.isArray(answer) ? answer : [answer];
  if (values.length === 0) {
    return null;
  }
  return values.map((value) => optionLabel(field, value)).join('、');
};

const optionLabel = (field: QuestionField, value: string): string => {
  return field.options?.find((option) => option.value === value)?.label ?? value;
};
