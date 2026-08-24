import { apiClient } from '@/services/apiClient';
import type { ArtifactKind, Message, ScenarioKey, Upload } from '@/types/api';

/** What the composer hands over for one run. The run itself is streamed by
 *  `agentApi.streamAgentMessage`; this module only reads the thread's history. */
export interface SendMessageInput {
  text: string;
  scenarioKey?: ScenarioKey;
  artifactKind?: ArtifactKind;
  attachments?: Upload[];
}

export const messageApi = {
  listMessages: (sessionId: string) => apiClient.get<Message[]>(`/sessions/${sessionId}/messages`),
};
