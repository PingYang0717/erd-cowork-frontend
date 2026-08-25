import type { Message } from './message';
import type { UploadedFileInfo } from './upload';

export interface Session {
  id: string;
  title: string;
  /** 前端-only extension：後端沒有釘選概念。 */
  pinned: boolean;
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
}
