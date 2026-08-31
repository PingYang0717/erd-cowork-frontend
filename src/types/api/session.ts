import type { Message } from './message';
import type { UploadedFileInfo } from './upload';

export interface Session {
  id: string;
  title: string;
  /** 前端-only extension：後端沒有釘選概念。釘選的時間戳（ISO 8601），未釘選為 null。 */
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
   *  Optional because the backend has not shipped it yet — the endpoints it goes with
   *  (PATCH/DELETE /sessions/{id}/data-source) are mocked ahead of the real ones. A
   *  response without it reads as "nothing attached" rather than crashing the thread;
   *  make it required once the field is live. */
  dataSourceIds?: string[];
}
