import { http, HttpResponse } from 'msw';

import type { Artifact } from '@/types/api/artifact';
import type { ShareTarget } from '@/types/api/directory';
import type { ScenarioKey } from '@/types/api/scenario';

import { type ArtifactKind, buildArtifactFixture } from './artifactFixtures';
import { currentUser } from './currentUser';
import { messages } from './handlers.messages';
import { sessions } from './handlers.sessions';
import { createPersistedResource } from './persistedResource';

// Cross-module reads (sessions for the owner display, messages for version numbering)
// happen inside functions, never at module top level, so the import cycles are inert.

// The mock's own artifact record. It is not a slice of the wire `Artifact`: the
// contract dropped `kind` (returning later as `type`) and never had `scenario`, but
// the mock needs both to decide which fixture HTML to build — while `isOwn`,
// `ownerDisplay`, `sessionTitle` and the permission flags are things a backend
// derives per request rather than stores. `toArtifactDto` does that deriving.
// Key bumped to v5 for the reshaped record.
const ALICE_USER_ID = 'u-002';
const OWNER_DISPLAY_NAMES: Record<string, string> = { [ALICE_USER_ID]: 'Alice Wu' };

export interface StoredArtifact {
  id: string;
  sessionId: string;
  title: string;
  kind: ArtifactKind;
  scenario: ScenarioKey;
  ownerId: string;
  createdAt: string;
  pinnedAt: string | null;
  publishedAt: string | null;
  /** Shared out by its owner. Whether it was shared *to* you is `!isOwn`. */
  isShared: boolean;
}

interface StoredShare {
  artifactId: string;
  type: string;
  id: string;
}

/** Who each Artifact is shared with. Separate from the Artifact records because the list
 *  is read on its own endpoint, not nested in the DTO. */
const shares = createPersistedResource<StoredShare>('erd-cowork:artifact-shares:v1', []);

const targetKey = (target: { type: string; id: string }) => `${target.type}:${target.id}`;

function sharesOf(artifactId: string) {
  return shares
    .read()
    .filter((share) => share.artifactId === artifactId)
    .map(({ type, id }) => ({ type, id }));
}

export const artifacts = createPersistedResource<StoredArtifact>('erd-cowork:artifacts:v6', [
  {
    id: 'artifact-1',
    sessionId: 'session-1',
    title: 'SPC analysis — Vt (gate CD)',
    kind: 'dashboard',
    scenario: 'spc',
    ownerId: currentUser.id,
    createdAt: '2026-08-20T09:15:00.000Z',
    pinnedAt: null,
    publishedAt: '2026-08-20T09:20:00.000Z',
    isShared: false,
  },
  {
    id: 'artifact-2',
    sessionId: 'session-1',
    title: 'Inline dashboard — W12',
    kind: 'dashboard',
    scenario: 'inline',
    ownerId: currentUser.id,
    createdAt: '2026-08-21T10:00:00.000Z',
    pinnedAt: '2026-08-21T10:05:00.000Z',
    publishedAt: '2026-08-21T10:02:00.000Z',
    isShared: false,
  },
  {
    id: 'artifact-3',
    sessionId: 'session-2',
    title: 'Daily monitor (A14)',
    kind: 'slides',
    scenario: 'daily',
    ownerId: ALICE_USER_ID,
    createdAt: '2026-08-19T08:30:00.000Z',
    pinnedAt: null,
    publishedAt: '2026-08-19T08:35:00.000Z',
    isShared: true,
  },
  // Never published. The Gallery is a shelf of published work, so this one exists only
  // in its session's thread — it is here so that boundary is exercised, not assumed.
  {
    id: 'artifact-4',
    sessionId: 'session-1',
    title: 'Scratch — CPK by lot',
    kind: 'dashboard',
    scenario: 'spc',
    ownerId: currentUser.id,
    createdAt: '2026-08-22T14:00:00.000Z',
    pinnedAt: null,
    publishedAt: null,
    isShared: false,
  },
]);

function toArtifactDto(stored: StoredArtifact): Artifact {
  const isOwn = stored.ownerId === currentUser.id;
  return {
    id: stored.id,
    title: stored.title,
    sessionId: stored.sessionId,
    sessionTitle: sessions.read().find((session) => session.id === stored.sessionId)?.title ?? '',
    pinnedAt: stored.pinnedAt,
    publishedAt: stored.publishedAt,
    createdAt: stored.createdAt,
    owner: stored.ownerId,
    ownerDisplay: isOwn
      ? currentUser.name
      : (OWNER_DISPLAY_NAMES[stored.ownerId] ?? stored.ownerId),
    canPin: true,
    isOwn,
    isShared: stored.isShared,
    hasPersonalCopy: false,
  };
}
function updateArtifact(
  id: string | readonly string[] | undefined,
  change: Partial<StoredArtifact>,
) {
  const all = artifacts.read();
  const existing = all.find((artifact) => artifact.id === id);
  if (!existing) {
    return new HttpResponse(null, { status: 404 });
  }
  const updated: StoredArtifact = { ...existing, ...change };
  artifacts.write(all.map((artifact) => (artifact.id === id ? updated : artifact)));
  return HttpResponse.json(toArtifactDto(updated));
}

const setPublished = (id: string | readonly string[] | undefined, published: boolean) =>
  updateArtifact(id, { publishedAt: published ? new Date().toISOString() : null });

/** Each artifact IS a version (deriveArtifactVersions); number it the way the client
 *  does — by its position among the session's artifact-bearing messages — so the
 *  rendered "· vN" matches the menu. */
function artifactVersionNumber(artifact: { id: string; sessionId: string }): number {
  const artifactMessages = messages
    .read()
    .filter((m) => m.sessionId === artifact.sessionId && m.artifactId != null);
  const index = artifactMessages.findIndex((m) => m.artifactId === artifact.id);
  return index >= 0 ? index + 1 : 1;
}

export const artifactHandlers = [
  http.get('/api/artifacts', () => {
    return HttpResponse.json(artifacts.read().map(toArtifactDto));
  }),

  /** Toggle: which way it goes is the backend's call, so the request carries no
   *  direction and the client cannot act on a stale reading of its own. */
  // One endpoint, no body: the backend decides the direction and answers with the
  // Artifact, whose `pinnedAt` is what the client reads the new state from.
  http.post('/api/artifacts/:id/pin', ({ params }) => {
    const existing = artifacts.read().find((artifact) => artifact.id === params.id);
    return updateArtifact(params.id, {
      pinnedAt: existing?.pinnedAt == null ? new Date().toISOString() : null,
    });
  }),

  /** 發布 / 取消發布 — split by method, and the timestamp is the server's to write. */
  http.post('/api/artifacts/:id/publish', ({ params }) => setPublished(params.id, true)),

  // Unpublish, not delete: the Artifact goes on living in the conversation that produced
  // it — what it loses is its place on the Gallery's shelf.
  http.delete('/api/artifacts/:id/publish', ({ params }) => setPublished(params.id, false)),

  http.get('/api/artifacts/:id', ({ params }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    const fixture = buildArtifactFixture(
      artifact.scenario,
      artifact.kind,
      artifactVersionNumber(artifact),
    );
    // The backend serves text/html directly, not { html } JSON. The `r` cache-buster
    // (reload nonce) needs no reading — the same document simply goes out again.
    return new HttpResponse(fixture, { headers: { 'Content-Type': 'text/html' } });
  }),

  // The artifact's source before assembly. The chat bubble lazy-fetches it when the
  // reader expands "view HTML"; the rendered fixture stands in for the source.
  http.get('/api/artifacts/:id/raw', ({ params }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    const fixture = buildArtifactFixture(
      artifact.scenario,
      artifact.kind,
      artifactVersionNumber(artifact),
    );
    return new HttpResponse(fixture, { headers: { 'Content-Type': 'text/plain' } });
  }),

  // Rebuilding an artifact whose HTML threw. Every repair here succeeds — a real
  // backend can also come back empty-handed, which the UI already handles; tests
  // exercise that path by stubbing this endpoint.
  // Share has no backend this round: the mock answers the agreed error shape so the
  // UI exercises the same path the real backend produces.
  // Reading is what the dialog opens on; the change is a delta, so two people editing
  // the same Artifact add and remove their own recipients instead of the second one
  // silently reverting the first.
  http.get('/api/artifacts/:id/share', ({ params }) =>
    HttpResponse.json(sharesOf(params.id as string)),
  ),

  http.patch('/api/artifacts/:id/share', async ({ params, request }) => {
    const artifactId = params.id as string;
    const { add = [], remove = [] } = (await request.json()) as {
      add?: ShareTarget[];
      remove?: ShareTarget[];
    };
    const removed = new Set(remove.map(targetKey));
    const kept = shares
      .read()
      .filter((share) => share.artifactId !== artifactId || !removed.has(targetKey(share)));
    const existing = new Set(
      kept.filter((share) => share.artifactId === artifactId).map(targetKey),
    );
    shares.write([
      ...kept,
      ...add
        .filter((target) => !existing.has(targetKey(target)))
        .map((target) => ({ artifactId, type: target.type, id: target.id })),
    ]);

    // `isShared` is the owner's view of whether anyone holds it, so it follows the list.
    const all = artifacts.read();
    const isShared = sharesOf(artifactId).length > 0;
    artifacts.write(
      all.map((artifact) => (artifact.id === artifactId ? { ...artifact, isShared } : artifact)),
    );
    return HttpResponse.json(sharesOf(artifactId));
  }),

  http.post('/api/artifacts/:id/repair', ({ params }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ repaired: true });
  }),
];
