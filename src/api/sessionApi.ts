import type { Session, SessionDetail } from '@/types/api/session';

import { apiClient } from './apiClient';

export const listSessions = () => apiClient.get<Session[]>('/sessions');

export const getSession = (id: string) => apiClient.get<SessionDetail>(`/sessions/${id}`);

/** What a rename answers with. Like the artifact endpoints, it names its subject
 *  `sessionId` rather than `id`, and carries only what the call settled. */
export interface SessionRenameResult {
  sessionId: string;
  title: string;
}

/** Renames a session. Its own path rather than a PATCH on the session itself: the
 *  endpoint does one named thing, and a body of `{ title }` on `/sessions/{id}` would
 *  read as a general edit that happens to carry a title.
 *
 *  No caller reads the answer — the new title arrived as the argument, so the cache is
 *  rewritten from that. It is typed anyway, so the next person to reach for it sees the
 *  real shape rather than assuming a `Session`. */
export const renameSession = (id: string, title: string) =>
  apiClient.patch<SessionRenameResult>(`/sessions/${id}/rename`, { title });

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
