import type { Message } from './message';
import type { UploadedFileInfo } from './upload';

export interface Session {
  id: string;
  title: string;
  /** Frontend-only extension: the backend has no concept of pinning. When it was pinned
   *  (ISO 8601); null when not pinned. */
  pinnedAt: string | null;
  updatedAt: string;
}

/** Backend contract shape (cowork master): GET /sessions/{id} nests the session's
 *  messages and files — there is no standalone messages endpoint. */
export interface SessionDetail {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  files: UploadedFileInfo[];
  /** Data sources attached to this session, by connector id. Attachment is per session,
   *  not per user: two conversations can draw on different sources, and a run's answer
   *  is only reproducible if you know what it was allowed to read.
   *
   *  Required: the backend ships it. `types/api` is the only defence there is
   *  (ADR-0013), so an optional field here would be a claim that the backend sometimes
   *  omits it — and every call site would have to spell `?? []`, which reads the same as
   *  "nothing attached" and hides the difference. */
  connectors: string[];
}
