import type { QuestionAnswer, QuestionForm, StepItem } from './agentEvent';
import type { ScenarioKey } from './scenario';
import type { Upload } from './upload';

export type MessageRole = 'user' | 'ai';

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  text: string;
  scenario?: ScenarioKey;
  steps?: StepItem[];
  artifactName?: string;
  artifactId?: string;
  attachments?: Upload[];
  /** A reask the user has answered. Kept so the thread can show what was set, collapsed
   *  — the form itself is gone by then, since answering starts the next run. */
  answeredForm?: QuestionForm;
  answers?: Record<string, QuestionAnswer>;
}
