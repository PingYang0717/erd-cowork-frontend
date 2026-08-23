import { apiClient } from '@/services/apiClient';
import type { Message, ScenarioKey } from '@/types/api';

export interface SendMessageInput {
  text: string;
  scenarioKey?: ScenarioKey;
}

export interface SendMessageResult {
  userMessage: Message;
  aiMessage: Message;
}

export const messageApi = {
  listMessages: (sessionId: string) => apiClient.get<Message[]>(`/sessions/${sessionId}/messages`),

  sendMessage: (sessionId: string, input: SendMessageInput) =>
    apiClient.post<SendMessageResult>(`/sessions/${sessionId}/messages`, input),
};
