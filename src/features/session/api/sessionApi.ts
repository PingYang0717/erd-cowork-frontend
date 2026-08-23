import { apiClient } from '@/services/apiClient';
import type { Session } from '@/types/api/session';

export const sessionApi = {
  listSessions: () => apiClient.get<Session[]>('/sessions'),

  createSession: () => apiClient.post<Session>('/sessions', {}),

  renameSession: (id: string, title: string) =>
    apiClient.patch<Session>(`/sessions/${id}`, { title }),

  setSessionPinned: (id: string, pinned: boolean) =>
    apiClient.patch<Session>(`/sessions/${id}`, { pinned }),

  deleteSession: (id: string) => apiClient.delete<void>(`/sessions/${id}`),
};
