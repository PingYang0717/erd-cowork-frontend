import { getTranslations } from '@/i18n/useTranslations';
import type { Question, QuestionForm } from '@/types/api/agentEvent';

/** Lifts the backend's flat question list into the form the UI renders.
 *
 *  This is lossy in one direction only, and the loss is real: the flat list cannot
 *  express a field kind (so a date range or a free-text answer both become a list of
 *  options), a dependency between fields, or anything an option carries beyond its label.
 *  A backend that is to drive the full analysis-conditions forms has to send
 *  `QuestionForm` itself — that ask is on the backend feedback list. */
export const liftQuestions = (questions: Question[]): QuestionForm => {
  const t = getTranslations().chat;
  return {
    formKey: 'backend-question',
    title: t.questionTitle,
    fields: questions.map((question, index) => ({
      key: `q${index}`,
      label: question.text,
      kind: question.multiSelect ? 'multi' : 'single',
      required: true,
      options: question.options.map((option) => ({ value: option, label: option })),
    })),
    submitLabel: t.questionSubmit,
    disabledHint: t.questionDisabledHint,
    summaryLabel: t.questionTitle,
  };
};
