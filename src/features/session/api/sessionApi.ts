import { apiClient } from '@/services/apiClient';
import type { Session } from '@/types/api/session';

// apiClient's response interceptor unwraps `response.data`, so the runtime
// value matches these return types even though axios's own types still say
// `AxiosResponse<T>`.
export const sessionApi = {
  listSessions: () => apiClient.get<Session[]>('/sessions') as unknown as Promise<Session[]>,

  createSession: () => apiClient.post<Session>('/sessions', {}) as unknown as Promise<Session>,

  renameSession: (id: string, title: string) =>
    apiClient.patch<Session>(`/sessions/${id}`, { title }) as unknown as Promise<Session>,

  setSessionPinned: (id: string, pinned: boolean) =>
    apiClient.patch<Session>(`/sessions/${id}`, { pinned }) as unknown as Promise<Session>,

  deleteSession: (id: string) =>
    apiClient.delete<void>(`/sessions/${id}`) as unknown as Promise<void>,
};
