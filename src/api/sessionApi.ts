import type { Session, SessionDetail } from '@/types/api/session';

import { apiClient } from './apiClient';

export const sessionApi = {
  listSessions: () => apiClient.get<Session[]>('/sessions').then((res) => res.data),

  getSession: (id: string) =>
    apiClient.get<SessionDetail>(`/sessions/${id}`).then((res) => res.data),

  /** Mock-only. The real backend has no POST /sessions — a session is created by the
   *  first message that names it, so "New chat" opens a client-side draft instead
   *  (ADR-0005). Kept because the mock still answers it. */
  createSession: () => apiClient.post<Session>('/sessions', {}).then((res) => res.data),

  renameSession: (id: string, title: string) =>
    apiClient.patch<Session>(`/sessions/${id}`, { title }).then((res) => res.data),

  /** Toggles the pin (artifact-family style): no body, the backend decides the
   *  direction and stamps the time. Response is `{ id, pinnedAt | null }`. */
  togglePin: (id: string) =>
    apiClient
      .post<{ id: string; pinnedAt: string | null }>(`/sessions/${id}/pin`)
      .then((res) => res.data),

  deleteSession: (id: string) => apiClient.delete<void>(`/sessions/${id}`).then(() => undefined),
};
