import type { Message } from '@/types/api/message';
import type { Session, SessionDetail } from '@/types/api/session';

import { apiClient } from './apiClient';
import { UPLOADED_FILE } from './fileApi';
import { asArray, asObject, type Contract } from './responseContract';

/** What a list row promises (ADR-0013). `updatedAt` is required because the rail's
 *  recency sort calls `.localeCompare` on it — a number here crashed the whole rail,
 *  which is exactly the shape the kind check exists to stop. */
const SESSION: Contract<Session> = {
  label: 'the session list',
  fields: {
    id: { kind: 'string' },
    title: { kind: 'string' },
    pinnedAt: { kind: 'string', nullable: true, fallback: null },
    updatedAt: { kind: 'string' },
  },
};

/** `text` falls back to empty — a message with no prose still renders its steps and
 *  Artifact chip, and `deriveArtifactVersions` slices it. `sender` is required: which
 *  side a bubble sits on is not something to guess. */
const MESSAGE: Contract<Message> = {
  label: 'the message',
  fields: {
    id: { kind: 'string' },
    sender: { kind: 'string' },
    text: { kind: 'string', fallback: '' },
    stepsJson: { kind: 'string', nullable: true, fallback: null },
    artifactId: { kind: 'string', nullable: true, fallback: null },
    createdAt: { kind: 'string' },
    artifactTitle: { kind: 'string', nullable: true, fallback: null },
    questionsJson: { kind: 'string', nullable: true, fallback: null },
  },
};

/** `messages` is required — an absent list rendering as an empty thread would wear
 *  "no messages yet" over a read that failed. `dataSourceIds` falls back to empty
 *  because the backend has not shipped it (see the type's own note). */
const SESSION_DETAIL: Contract<SessionDetail> = {
  label: 'the conversation',
  fields: {
    id: { kind: 'string' },
    title: { kind: 'string' },
    createdAt: { kind: 'string' },
    messages: { kind: 'array', of: MESSAGE },
    files: { kind: 'array', of: UPLOADED_FILE, fallback: [] },
    dataSourceIds: { kind: 'array', fallback: [] },
  },
};

export const listSessions = () => apiClient.get('/sessions').then(asArray(SESSION));

export const getSession = (id: string) =>
  apiClient.get(`/sessions/${id}`).then(asObject(SESSION_DETAIL));

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
export const toggleSessionPin = (id: string) =>
  apiClient.patch<SessionPinResult>(`/sessions/${id}/pin`);

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
