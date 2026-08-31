import type { Session, SessionDetail } from '@/types/api/session';

import { apiClient } from './apiClient';

export const sessionApi = {
  listSessions: () => apiClient.get<Session[]>('/sessions'),

  getSession: (id: string) => apiClient.get<SessionDetail>(`/sessions/${id}`),

  /** Mock-only. The real backend has no POST /sessions — a session is created by the
   *  first message that names it, so "New chat" opens a client-side draft instead
   *  (ADR-0005). Kept because the mock still answers it. */
  createSession: () => apiClient.post<Session>('/sessions', {}),

  renameSession: (id: string, title: string) =>
    apiClient.patch<Session>(`/sessions/${id}`, { title }),

  /** Toggles the pin (artifact-family style): no body, the backend decides the
   *  direction and stamps the time. Response is `{ id, pinnedAt | null }`. */
  togglePin: (id: string) =>
    apiClient.post<{ id: string; pinnedAt: string | null }>(`/sessions/${id}/pin`),

  deleteSession: (id: string) => apiClient.delete<void>(`/sessions/${id}`),

  /** Attaches a data source to the session. PATCH rather than PUT: this adds one source
   *  to whatever is already attached, it does not replace the set. */
  attachDataSource: (id: string, connectorId: string) =>
    apiClient.patch<void>(`/sessions/${id}/data-source`, { connectorId }),

  /** Detaches one data source. The id travels in the body rather than the path because
   *  the endpoint is `/data-source` for both directions. */
  detachDataSource: (id: string, connectorId: string) =>
    apiClient.delete<void>(`/sessions/${id}/data-source`, { data: { connectorId } }),
};
