import type { QuestionAnswer, QuestionField, QuestionForm } from '@/types/api/agentEvent';

/** The backend's message body is question-only (`{ question, baseArtifactId? }`), so a
 *  form's answers go back as one prose sentence — the same shape cowork-master's
 *  ChatPanel sends. Values map to their option labels so the sentence reads the way the
 *  form did; the structured `{ answers, inReplyTo }` wire is on the backend feedback
 *  list, not in the contract. */
/** The three marks the sentence is built from. Named because `parseAnswerText` below has
 *  to find its way back through them — the round trip is what lets a past reask show what
 *  was chosen, and a change to one direction that missed the other would break it
 *  silently. Note the parse anchors on whole labels rather than splitting on these: the
 *  labels themselves routinely contain them. */
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
  return values.map((value) => optionLabel(field, value)).join(VALUE_SEPARATOR);
};

const optionLabel = (field: QuestionField, value: string): string => {
  return field.options?.find((option) => option.value === value)?.label ?? value;
};

/** Reads a composed answer back into the form's own values.
 *
 *  This is the only way a past reask can show what was chosen. The answers are not stored
 *  anywhere — no `answersJson` on the wire, and the structured `{ answers, inReplyTo }`
 *  channel is on the backend feedback list, not in the contract — so the sentence the user
 *  sent IS the record of them. It is sitting in the thread already, as the USER message
 *  right after the card.
 *
 *  **Anchored on whole labels and whole option labels, never on the separators.** The
 *  sentence is prose written for the backend to read, not a format: a field label is the
 *  backend's own question text and routinely carries a colon of its own
 *  (`資料量偏大：要先看哪幾個 Lot`), and an option label can carry the value separator
 *  (`整段 flow、含 loop`). Splitting on the first separator cut those in half and dropped
 *  the field — chips survived because their labels are short and plain, while the longer
 *  questions, which are exactly the ones rendered as dropdowns, came back blank.
 *
 *  Returns null when the text is not an answer to this form: a reader who ignored a reask
 *  and typed something else leaves an ordinary message in exactly the same position, and
 *  reading that as answers would put words in their mouth. One matched field label is
 *  enough — a partial parse of a real answer beats showing an empty card.
 *
 *  A value is either an option this form offers or text kept verbatim, so a misread can
 *  only ever leave a field blank; it can never light up an option the reader did not pick.
 */
export const parseAnswerText = (form: QuestionForm, text: string): Record<string, QuestionAnswer> | null => {
  const marks = form.fields
    .map((field) => ({ field, at: text.indexOf(`${field.label}${LABEL_SEPARATOR}`) }))
    .filter((mark) => mark.at !== -1)
    .sort((left, right) => left.at - right.at)
    // One label can sit inside another's ("Lot" inside "Lot scope"). The longer mark is
    // the real one; a hit that starts inside another's own label is that label's text.
    .filter((mark, _index, all) =>
      all.every((other) => other === mark || mark.at <= other.at || mark.at >= other.at + other.field.label.length)
    );

  const answers: Record<string, QuestionAnswer> = {};

  marks.forEach((mark, index) => {
    const from = mark.at + mark.field.label.length + LABEL_SEPARATOR.length;
    const to = index + 1 < marks.length ? marks[index + 1].at : text.length;
    const display = text
      .slice(from, to)
      .trim()
      .replace(new RegExp(`${FIELD_SEPARATOR}$`), '')
      .trim();
    if (display === '') {
      return;
    }
    answers[mark.field.key] = answerFor(mark.field, display);
  });

  return Object.keys(answers).length > 0 ? answers : null;
};

const answerFor = (field: QuestionField, display: string): QuestionAnswer => {
  // A boolean only ever reaches the sentence when it was switched on — `displayValue`
  // drops it otherwise — so its presence is the answer.
  if (field.kind === 'boolean') {
    return true;
  }
  const values = readValues(field, display);
  return field.kind === 'multi' ? values : values[0];
};

/** Consumes the display run one option at a time, longest label first, so an option whose
 *  own label contains the value separator is not torn in half by it. Anything no option
 *  claims is kept verbatim — that is what an `allowCustom` field's typed answer looks
 *  like, and the card renders it in the custom input exactly as it would have. */
const readValues = (field: QuestionField, display: string): string[] => {
  const byLongestLabel = [...(field.options ?? [])].sort((left, right) => right.label.length - left.label.length);
  const values: string[] = [];
  let rest = display;

  while (rest !== '') {
    // A whole option, not a prefix of the answer: `A14` must not claim `A14X`.
    const option = byLongestLabel.find(
      (candidate) => rest.startsWith(candidate.label) && endsAValue(rest.slice(candidate.label.length))
    );

    if (option) {
      values.push(option.value);
      rest = rest.slice(option.label.length);
    } else {
      const at = firstBoundary(rest);
      values.push((at === -1 ? rest : rest.slice(0, at)).trim());
      rest = at === -1 ? '' : rest.slice(at);
    }

    if (!rest.startsWith(VALUE_SEPARATOR)) {
      // Either the run is over, or what follows is the next field — the last field's
      // slice runs to the end of the sentence, so a label this form does not know
      // ("Something else：42") would otherwise be swallowed into its answer.
      break;
    }
    rest = rest.slice(VALUE_SEPARATOR.length);
  }

  return values.filter((value) => value !== '');
};

/** Where a value can legally end: at the next one, at the next field, or at the end. */
const endsAValue = (rest: string): boolean =>
  rest === '' || rest.startsWith(VALUE_SEPARATOR) || rest.startsWith(FIELD_SEPARATOR);

const firstBoundary = (rest: string): number => {
  const marks = [rest.indexOf(VALUE_SEPARATOR), rest.indexOf(FIELD_SEPARATOR)].filter((at) => at !== -1);
  return marks.length === 0 ? -1 : Math.min(...marks);
};
