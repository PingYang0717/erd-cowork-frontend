import { http, HttpResponse } from 'msw';

import { DRAFT_SESSION_TITLE } from '@/constants/messages';
import type { Session } from '@/types/api/session';

import { sessionFiles, toFileDto } from './handlers.files';
import { messages, toMessageDto } from './handlers.messages';
import { createPersistedResource } from './persistedResource';

// Cross-module reads (messages / files for the embedded detail) happen inside the
// handlers, never at module top level, so the import cycle with those modules is inert.

export const sessions = createPersistedResource<Session>('erd-cowork:sessions:v2', [
  {
    id: 'session-1',
    title: 'SPC — Vt (gate CD)',
    pinnedAt: '2026-08-20T09:05:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z',
  },
  {
    id: 'session-2',
    title: 'Defect pareto — W12',
    pinnedAt: null,
    updatedAt: '2026-08-19T09:00:00.000Z',
  },
]);

/** Which data sources each session has attached. Separate from the Session records
 *  because attachment surfaces in the detail, not in the list. The two seeded sessions
 *  start with the three sources that were previously "connected" in the catalogue, so
 *  the panel opens on the same state it always did. */
export const sessionDataSources = createPersistedResource<{
  sessionId: string;
  connectorId: string;
}>('erd-cowork:session-data-sources:v1', [
  { sessionId: 'session-1', connectorId: 'inline' },
  { sessionId: 'session-1', connectorId: 'wat' },
  { sessionId: 'session-1', connectorId: 'cp' },
  { sessionId: 'session-2', connectorId: 'inline' },
  { sessionId: 'session-2', connectorId: 'wat' },
  { sessionId: 'session-2', connectorId: 'cp' },
]);

/** Creates the session if this client has never sent to it before, and stamps its
 *  last activity either way. Mirrors ChatSession implementing Persistable<String>:
 *  the backend upserts on send rather than exposing a create endpoint. */
export function upsertSession(sessionId: string): void {
  const all = sessions.read();
  const existing = all.find((session) => session.id === sessionId);
  const now = new Date().toISOString();

  if (existing) {
    sessions.write(
      all.map((session) => (session.id === sessionId ? { ...session, updatedAt: now } : session)),
    );
    return;
  }

  sessions.write([
    ...all,
    { id: sessionId, title: DRAFT_SESSION_TITLE, pinnedAt: null, updatedAt: now },
  ]);
}

export const sessionHandlers = [
  http.get('/api/sessions', () => {
    return HttpResponse.json(sessions.read());
  }),

  // The backend has no standalone messages endpoint: a session's messages and
  // files are nested inside its detail.
  http.get('/api/sessions/:sessionId', ({ params }) => {
    const session = sessions.read().find((s) => s.id === params.sessionId);
    if (!session) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      id: session.id,
      title: session.title,
      // The mock's Session seeds carry no createdAt of their own; updatedAt is
      // the closest truth it has.
      createdAt: session.updatedAt,
      messages: messages
        .read()
        .filter((message) => message.sessionId === session.id)
        .map(toMessageDto),
      files: sessionFiles
        .read()
        .filter((file) => file.sessionId === session.id)
        .map(toFileDto),
      dataSourceIds: sessionDataSources
        .read()
        .filter((link) => link.sessionId === session.id)
        .map((link) => link.connectorId),
    });
  }),

  // Data sources attach to a session, not to the user: PATCH adds one to whatever is
  // already there, DELETE removes one. Both answer a bare 200 — the caller refetches
  // the detail, which is where attachment lives.
  http.patch('/api/sessions/:sessionId/data-source', async ({ params, request }) => {
    const { connectorId } = (await request.json()) as { connectorId: string };
    const sessionId = params.sessionId as string;
    const links = sessionDataSources.read();
    if (!links.some((link) => link.sessionId === sessionId && link.connectorId === connectorId)) {
      sessionDataSources.write([...links, { sessionId, connectorId }]);
    }
    return new HttpResponse(null, { status: 200 });
  }),

  http.delete('/api/sessions/:sessionId/data-source', async ({ params, request }) => {
    const { connectorId } = (await request.json()) as { connectorId: string };
    const sessionId = params.sessionId as string;
    sessionDataSources.write(
      sessionDataSources
        .read()
        .filter((link) => !(link.sessionId === sessionId && link.connectorId === connectorId)),
    );
    return new HttpResponse(null, { status: 200 });
  }),

  // The three session writes, as agreed with the backend (api-checklist.md):
  // rename is a PATCH, pin is an artifact-family toggle that stamps its own time
  // and answers { id, pinnedAt }, delete answers a bare 200.
  http.patch('/api/sessions/:sessionId', async ({ params, request }) => {
    const body = (await request.json()) as { title?: string };
    const all = sessions.read();
    const session = all.find((stored) => stored.id === params.sessionId);
    if (!session) {
      return new HttpResponse(null, { status: 404 });
    }
    const updated = { ...session, ...(body.title !== undefined ? { title: body.title } : {}) };
    sessions.write(all.map((stored) => (stored.id === updated.id ? updated : stored)));
    return HttpResponse.json(updated);
  }),

  http.post('/api/sessions/:sessionId/pin', ({ params }) => {
    const all = sessions.read();
    const session = all.find((stored) => stored.id === params.sessionId);
    if (!session) {
      return new HttpResponse(null, { status: 404 });
    }
    const pinnedAt = session.pinnedAt === null ? new Date().toISOString() : null;
    sessions.write(
      all.map((stored) => (stored.id === session.id ? { ...stored, pinnedAt } : stored)),
    );
    return HttpResponse.json({ id: session.id, pinnedAt });
  }),

  http.delete('/api/sessions/:sessionId', ({ params }) => {
    sessions.write(sessions.read().filter((stored) => stored.id !== params.sessionId));
    messages.write(messages.read().filter((message) => message.sessionId !== params.sessionId));
    sessionFiles.write(sessionFiles.read().filter((file) => file.sessionId !== params.sessionId));
    return new HttpResponse(null, { status: 200 });
  }),
];
