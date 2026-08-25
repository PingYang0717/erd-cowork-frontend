import { describe, expect, it } from 'vitest';

import { allHandlers, handlers, handlersForTransport } from './handlers';

/** What the live backend serves, method-aware. Mirrors `docs/api/interface.md` →
 *  傳輸模式與 live 端點覆蓋範圍. */
const LIVE_BACKED = [
  'GET /api/sessions',
  'GET /api/sessions/:sessionId',
  'POST /api/sessions/:sessionId/messages',
  'POST /api/sessions/:sessionId/files',
  'DELETE /api/sessions/:sessionId/files/:fileId',
  'GET /api/artifacts/:id',
  'POST /api/artifacts/:id/repair',
];

// Schedule has no endpoint because the page is still a stub — see the gap notes in
// .scratch/erd-cowork-agent-streaming/spec.md.
const NEVER_LIVE = ['/api/artifacts', '/api/directory', '/api/connectors', '/api/dc-items'];

function descriptors(list: typeof allHandlers) {
  return list.map((handler) => `${String(handler.info.method)} ${String(handler.info.path)}`);
}

function paths(list: typeof allHandlers) {
  return list.map((handler) => String(handler.info.path));
}

describe('transport-aware handler set', () => {
  it('keeps serving everything no backend implements', () => {
    for (const path of NEVER_LIVE) {
      expect(paths(allHandlers)).toContain(path);
    }
  });

  it('registers every handler in mock mode', () => {
    // VITE_AGENT_TRANSPORT is unset under test, so this is the mock configuration.
    expect(descriptors(handlers)).toEqual(descriptors(allHandlers));
    for (const descriptor of LIVE_BACKED) {
      expect(descriptors(handlers)).toContain(descriptor);
    }
  });

  it('steps aside for exactly the live-backed endpoints in live mode, by method', () => {
    const live = descriptors(handlersForTransport('live'));

    for (const descriptor of LIVE_BACKED) {
      expect(live).not.toContain(descriptor);
    }
    // Session rename/pin/delete share the live GET path but have no backend —
    // they must stay mocked even in live mode.
    expect(live).toContain('PATCH /api/sessions/:id');
    expect(live).toContain('DELETE /api/sessions/:id');
    expect(live).toContain('POST /api/sessions');
    for (const path of NEVER_LIVE) {
      expect(descriptors(handlersForTransport('live')).join(' ')).toContain(path);
    }
  });
});
