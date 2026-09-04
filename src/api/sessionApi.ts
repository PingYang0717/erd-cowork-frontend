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

/** What the pin endpoint answers with. Names its subject `sessionId` rather than `id`,
 *  and carries only what the toggle settled.
 *
 *  `owner` and `isOwn` have no home on a `Session` — the list rows do not carry either.
 *  So unlike the artifact pin, whose answer can be applied field by field onto the cached
 *  row, there is nothing here to apply: the list is re-read instead. */
export interface SessionPinResult {
  sessionId: string;
  pinnedAt: string | null;
  owner: string;
  isOwn: boolean;
}

/** Toggles the pin: no body, the backend decides the direction and stamps the time.
 *
 *  PATCH, not POST: it edits one field of something that already exists. */
export const toggleSessionPin = (id: string) => apiClient.patch<SessionPinResult>(`/sessions/${id}/pin`);

/** Removes a session from the user's list.
 *
 *  The backend soft-deletes — hence PATCH on `/soft-delete` rather than a DELETE on the
 *  session: the row is marked, not destroyed, so the verb that reaches it is an edit. The
 *  function keeps the name `deleteSession` because that is what the person clicking it is
 *  doing; whether the backend can undo it later is not something the UI offers. */
export const deleteSession = (id: string) => apiClient.patch<void>(`/sessions/${id}/soft-delete`);

/** Attaches a data source to the session. PATCH rather than PUT: this adds one source to
 *  whatever is already attached, it does not replace the set. */
export const attachDataSource = (id: string, connectorId: string) =>
  apiClient.patch<void>(`/sessions/${id}/data-source`, { connectorId });

/** Detaches one data source. The id travels in the body rather than the path because the
 *  endpoint is `/data-source` for both directions. */
export const detachDataSource = (id: string, connectorId: string) =>
  apiClient.delete<void>(`/sessions/${id}/data-source`, { data: { connectorId } });
