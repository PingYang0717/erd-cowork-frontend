import type { UploadedFileInfo } from '@/types/api';

import { apiClient } from './apiClient';

/** Where an upload actually is. `onUploadProgress` measures bytes leaving this
 *  machine — nothing more — so the transfer maps to 0–90 and parks there while the
 *  backend receives and parses. The old 0–100 mapping hit 100 the moment the body
 *  flushed, and then sat "complete" for as long as the server still worked: a bar
 *  claiming a fact it could not know. The remaining 90→100 is not animated for the
 *  same reason — this client has no basis to estimate the server's share. */
export interface UploadProgress {
  percent: number;
  phase: 'transferring' | 'processing';
}

export const uploadFiles = (
  sessionId: string,
  files: File[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadedFileInfo[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return apiClient.post<UploadedFileInfo[]>(`/sessions/${sessionId}/files`, formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        // floor, not round: the bar may only reach 90 when the last byte is out.
        onProgress({
          percent: Math.floor((event.loaded / event.total) * 90),
          phase: event.loaded >= event.total ? 'processing' : 'transferring',
        });
      }
    },
  });
};

export const deleteFile = (sessionId: string, fileId: string): Promise<void> =>
  apiClient.delete(`/sessions/${sessionId}/files/${fileId}`);
