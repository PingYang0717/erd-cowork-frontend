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
    fields: questions.map((question, index) => {
      // No options is the backend asking an open question — "describe the time range you
      // want" has nothing to offer. It used to lift into a choice with nothing to choose:
      // an empty row, no input, and a Submit button disabled for good. The reader was
      // asked something they had no way to answer.
      if (question.options.length === 0) {
        return {
          key: `q${index}`,
          label: question.text,
          kind: 'text' as const,
          required: true,
          placeholder: t.questionOpenPlaceholder,
        };
      }

      // Offered options, and a box beside them. What the backend lists is what its model
      // guessed the answer might be, and guessing short is the normal case — without this
      // the reader can only answer inside the guess.
      return {
        key: `q${index}`,
        label: question.text,
        kind: question.multiSelect ? ('multi' as const) : ('single' as const),
        required: true,
        options: question.options.map((option) => ({ value: option, label: option })),
        allowCustom: true,
        // The list's placeholder. The box below it has its own, fixed wording — the two
        // are different controls and must not read the same.
        placeholder: t.questionSelectPlaceholder,
      };
    }),
    submitLabel: t.questionSubmit,
    disabledHint: t.questionDisabledHint,
    summaryLabel: t.questionTitle,
  };
};
