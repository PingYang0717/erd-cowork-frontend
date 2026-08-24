import { describe, expect, it } from 'vitest';

import { allHandlers, handlers } from './handlers';

/** Which paths the live backend serves, and which MSW must keep serving regardless.
 *  Mirrors `docs/api/interface.md` → 傳輸模式與 live 端點覆蓋範圍. */
const LIVE_BACKED = ['/api/sessions', '/api/sessions/:sessionId/messages', '/api/uploads'];

// Schedule has no endpoint because the page is still a stub — see the gap notes in
// .scratch/erd-cowork-agent-streaming/spec.md.
const NEVER_LIVE = ['/api/artifacts', '/api/directory', '/api/connectors', '/api/dc-items'];

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
    expect(paths(handlers)).toEqual(paths(allHandlers));
    for (const path of LIVE_BACKED) {
      expect(paths(handlers)).toContain(path);
    }
  });
});
