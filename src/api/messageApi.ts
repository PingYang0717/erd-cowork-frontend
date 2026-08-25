import type { Message, Upload } from '@/types/api/index';

import { apiClient } from './apiClient';

/** What the composer hands over for one run. The run itself is streamed by
 *  `agentApi.streamAgentMessage`; this module only reads the thread's history.
 *  The shape mirrors the backend body: question plus an optional base artifact —
 *  attachments are a 前端-only extension until session-level uploads land. */
export interface SendMessageInput {
  question: string;
  baseArtifactId?: string;
  attachments?: Upload[];
}

export const messageApi = {
  listMessages: (sessionId: string) => apiClient.get<Message[]>(`/sessions/${sessionId}/messages`),
};
