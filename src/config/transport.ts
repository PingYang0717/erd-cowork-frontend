/** Which backend the app talks to. Build-time, not a runtime switch: a runtime toggle
 *  would force MSW into the production bundle (ADR-0005).
 *
 *  `live` only covers the endpoints a real backend implements — sessions, messages,
 *  artifact HTML, uploads, config. Everything else (the Artifacts gallery listing,
 *  sharing, the directory, Schedule, Connectors, DC items, artifact versions) is still
 *  served by MSW even in live mode; see `docs/api/interface.md`.
 */
export type Transport = 'mock' | 'live';

export const transport: Transport =
  import.meta.env.VITE_AGENT_TRANSPORT === 'live' ? 'live' : 'mock';

export const isLive = transport === 'live';
