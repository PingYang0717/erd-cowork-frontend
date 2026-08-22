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

// apiClient's response interceptor unwraps `response.data`, so the runtime
// value matches these return types even though axios's own types still say
// `AxiosResponse<T>`.
export const messageApi = {
  listMessages: (sessionId: string) =>
    apiClient.get<Message[]>(`/sessions/${sessionId}/messages`) as unknown as Promise<Message[]>,

  sendMessage: (sessionId: string, input: SendMessageInput) =>
    apiClient.post<SendMessageResult>(
      `/sessions/${sessionId}/messages`,
      input,
    ) as unknown as Promise<SendMessageResult>,
};
