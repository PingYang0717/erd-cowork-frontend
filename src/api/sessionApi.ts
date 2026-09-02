import type { Session, SessionDetail } from '@/types/api/session';

import { apiClient } from './apiClient';

export const listSessions = () => apiClient.get<Session[]>('/sessions');

export const getSession = (id: string) => apiClient.get<SessionDetail>(`/sessions/${id}`);

/** Renames a session. The answer is `unknown` for the same reason as the pin: unconfirmed
 *  and unread. The new title is already in hand from the argument, so nothing here needs
 *  the response. */
export const renameSession = (id: string, title: string) =>
  apiClient.patch<unknown>(`/sessions/${id}`, { title });

/** Toggles the pin: no body, the backend decides the direction and stamps the time.
 *
 *  The answer is typed `unknown` because its shape has never been confirmed, and no
 *  caller reads it — the pin state comes from re-reading the list. It used to be typed
 *  `{ id, pinnedAt }`, which was a guess dressed as knowledge: the artifact pin endpoint,
 *  the one this was assumed to match, turned out to name its subject `artifactId`, and a
 *  client that trusted the guessed type silently updated nothing. Anyone wanting to skip
 *  the refetch here has to ask the backend for the real shape first, which is the point. */
export const toggleSessionPin = (id: string) => apiClient.post<unknown>(`/sessions/${id}/pin`);

export const deleteSession = (id: string) => apiClient.delete<void>(`/sessions/${id}`);

/** Attaches a data source to the session. PATCH rather than PUT: this adds one source to
 *  whatever is already attached, it does not replace the set. */
export const attachDataSource = (id: string, connectorId: string) =>
  apiClient.patch<void>(`/sessions/${id}/data-source`, { connectorId });

/** Detaches one data source. The id travels in the body rather than the path because the
 *  endpoint is `/data-source` for both directions. */
export const detachDataSource = (id: string, connectorId: string) =>
  apiClient.delete<void>(`/sessions/${id}/data-source`, { data: { connectorId } });
