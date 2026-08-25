import type { QuestionAnswer, QuestionField, QuestionForm } from '@/types/api/agentEvent';

/** The backend's message body is question-only (`{ question, baseArtifactId? }`), so a
 *  form's answers go back as one prose sentence — the same shape cowork-master's
 *  ChatPanel sends. Values map to their option labels so the sentence reads the way the
 *  form did; the structured `{ answers, inReplyTo }` wire is on the backend feedback
 *  list, not in the contract. */
export function composeAnswerText(
  form: QuestionForm,
  answers: Record<string, QuestionAnswer>,
): string {
  const parts: string[] = [];

  for (const field of form.fields) {
    if (!isVisible(field, answers)) {
      continue;
    }
    const display = displayValue(field, answers[field.key]);
    if (display !== null) {
      parts.push(`${field.label}：${display}`);
    }
  }

  return parts.join('；');
}

function isVisible(field: QuestionField, answers: Record<string, QuestionAnswer>): boolean {
  if (!field.visibleWhen) {
    return true;
  }
  return answers[field.visibleWhen.field] === field.visibleWhen.equals;
}

function displayValue(field: QuestionField, answer: QuestionAnswer | undefined): string | null {
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
}

function optionLabel(field: QuestionField, value: string): string {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}
