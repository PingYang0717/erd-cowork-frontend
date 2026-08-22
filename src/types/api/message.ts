import type { ScenarioKey } from '@/types/api/scenario';

export type MessageRole = 'user' | 'ai';

export interface MessageStep {
  key: string;
  title: string;
  description: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  text: string;
  scenario?: ScenarioKey;
  steps?: MessageStep[];
  artifactName?: string;
  artifactId?: string;
}
