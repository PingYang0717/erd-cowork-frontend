export interface Upload {
  id: string;
  fileName: string;
  sizeBytes: number;
}

/** Backend contract shape (cowork master): POST /sessions/{id}/files response and
 *  SessionDetail.files. */
export interface UploadedFileInfo {
  id: string;
  name: string;
  alias: string;
  sizeBytes: number;
  type: string;
  rowCount: number | null;
  expired: boolean;
}
