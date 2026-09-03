import type { Artifact } from '@/types/api';

/** A published Artifact owned by the signed-in user — the starting point for anything
 *  that shares, publishes or renames one. Suites that need a different shape spread over
 *  it rather than restating all twelve fields, so a field added to the contract lands
 *  here once. */
export const artifactFixture = (overrides: Partial<Artifact> = {}): Artifact => {
  return {
    id: 'artifact-1',
    version: 'version 1',
    sessionId: 'session-1',
    sessionTitle: 'SPC — Vt (gate CD)',
    title: 'SPC analysis — Vt (gate CD)',
    createdAt: '2026-08-20T09:15:00.000Z',
    pinnedAt: null,
    publishedAt: '2026-08-20T09:20:00.000Z',
    owner: 'user-1',
    ownerDisplay: 'You',
    isOwn: true,
    isShared: false,
    hasPersonalCopy: false,
    ...overrides,
  };
};
