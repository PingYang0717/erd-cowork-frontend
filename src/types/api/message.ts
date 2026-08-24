import type { StepItem } from '@/types/api/agentEvent';
import type { ScenarioKey } from '@/types/api/scenario';
import type { Upload } from '@/types/api/upload';

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
}
