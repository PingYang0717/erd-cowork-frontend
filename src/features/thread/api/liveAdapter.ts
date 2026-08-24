import type { AgentEvent, QuestionForm, StepItem } from '@/types/api/agentEvent';
import type { Message } from '@/types/api/message';

/** What the Java backend puts on the wire. Its Mongo document shape leaks into the DTO
 *  — steps and questions arrive as JSON strings — so it is converted here, once, rather
 *  than teaching the UI two shapes. */
export interface BackendMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  stepsJson: string | null;
  artifactId: string | null;
  createdAt: string;
  artifactTitle: string | null;
  questionsJson: string | null;
}

/** The backend's reask: a flat list of single- or multi-choice questions, with no field
 *  kinds, no dependencies between them, and options that are bare strings. */
export interface BackendQuestion {
  text: string;
  options: string[];
  multiSelect: boolean;
}

function parseJson<T>(raw: string | null): T | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function toMessage(backend: BackendMessage, sessionId: string): Message {
  return {
    id: backend.id,
    sessionId,
    role: backend.sender === 'USER' ? 'user' : 'ai',
    text: backend.text,
    steps: parseJson<StepItem[]>(backend.stepsJson),
    artifactId: backend.artifactId ?? undefined,
    artifactName: backend.artifactTitle ?? undefined,
  };
}

/** Lifts the backend's flat question list into the form the UI renders.
 *
 *  This is lossy in one direction only, and the loss is real: the backend cannot express
 *  a field kind (so everything becomes chips), a dependency between fields (so CP Test's
 *  Flow/Loop cannot be asked conditionally), or per-option metadata (so a DC item cannot
 *  carry its spec limits). A backend that is to drive the analysis-conditions forms has
 *  to send `QuestionForm` itself — see the note in `docs/api/interface.md`.
 */
export function toQuestionForm(questions: BackendQuestion[]): QuestionForm {
  return {
    formKey: 'backend-question',
    title: '分析條件',
    fields: questions.map((question, index) => ({
      key: `q${index}`,
      label: question.text,
      kind: question.multiSelect ? 'multi' : 'single',
      required: true,
      options: question.options.map((option) => ({ value: option, label: option })),
    })),
    submitLabel: '送出',
    disabledHint: '請先回答上面的問題',
    summaryLabel: '分析條件',
  };
}

/** Normalises one streamed event. Only QUESTION differs in shape; the rest are already
 *  identical, which is why the event names were kept verbatim (ADR-0005). */
export function toAgentEvent(raw: AgentEvent | { type: 'QUESTION'; questions: BackendQuestion[] }) {
  if (raw.type === 'QUESTION' && 'questions' in raw) {
    return { type: 'QUESTION', form: toQuestionForm(raw.questions) } satisfies AgentEvent;
  }
  return raw as AgentEvent;
}
