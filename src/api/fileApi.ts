import type { UploadedFileInfo } from '@/types/api';

import { apiClient } from './apiClient';
import { type Contract, readArray } from './responseContract';

/** What a file row promises (ADR-0013). Identity and `sizeBytes` are required — the
 *  size reaches `formatBytes` and the client-side quota math, where a missing number
 *  turns into NaN everywhere at once. `expired` falls back to false: an unknown
 *  retention state lets the send through, and FILES_EXPIRED is the backend's own
 *  guard against that. Exported because SessionDetail nests rows of this shape. */
export const UPLOADED_FILE: Contract<UploadedFileInfo> = {
  label: 'the uploaded file',
  fields: {
    id: { kind: 'string' },
    name: { kind: 'string' },
    alias: { kind: 'string', fallback: '' },
    sizeBytes: { kind: 'number' },
    type: { kind: 'string', fallback: '' },
    rowCount: { kind: 'number', nullable: true, fallback: null },
    expired: { kind: 'boolean', fallback: false },
  },
};

export const uploadFiles = async (
  sessionId: string,
  files: File[],
  onProgress?: (percent: number) => void,
): Promise<UploadedFileInfo[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const body = await apiClient.post<unknown>(`/sessions/${sessionId}/files`, formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return readArray(body, UPLOADED_FILE);
};

export const deleteFile = (sessionId: string, fileId: string): Promise<void> =>
  apiClient.delete(`/sessions/${sessionId}/files/${fileId}`);
