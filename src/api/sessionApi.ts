import type { Session, SessionDetail } from '@/types/api/session';

import { apiClient } from './apiClient';

export const sessionApi = {
  listSessions: () => apiClient.get<Session[]>('/sessions'),

  getSession: (id: string) => apiClient.get<SessionDetail>(`/sessions/${id}`),

  /** Mock-only. The real backend has no POST /sessions — a session is created by the
   *  first message that names it, so "New chat" opens a client-side draft instead
   *  (ADR-0008). Kept because the mock still answers it. */
  createSession: () => apiClient.post<Session>('/sessions', {}),

  renameSession: (id: string, title: string) =>
    apiClient.patch<Session>(`/sessions/${id}`, { title }),

  /** `pinnedAt` 是釘選當下的時間戳；傳 null 表示取消釘選。 */
  setSessionPinned: (id: string, pinnedAt: string | null) =>
    apiClient.patch<Session>(`/sessions/${id}`, { pinnedAt }),

  deleteSession: (id: string) => apiClient.delete<void>(`/sessions/${id}`),
};
