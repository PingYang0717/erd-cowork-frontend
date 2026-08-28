// The mock backend, split by resource — each module owns its persisted store and its
// endpoints; this index only assembles them. It serves TESTS ONLY (ADR-0006): the app
// itself always talks to the real backend, and endpoints the backend has not built are
// stubbed in `src/api/`.
import { artifactHandlers } from './handlers.artifacts';
import { configHandlers } from './handlers.config';
import { fileHandlers } from './handlers.files';
import { messageHandlers } from './handlers.messages';
import { sessionHandlers } from './handlers.sessions';

export { setStreamPace } from './handlers.messages';
export { upsertSession } from './handlers.sessions';

export const handlers = [
  ...configHandlers,
  ...sessionHandlers,
  ...fileHandlers,
  ...messageHandlers,
  ...artifactHandlers,
];
