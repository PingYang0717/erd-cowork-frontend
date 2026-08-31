import type { UploadedFileInfo } from '@/types/api/index';

import { apiClient } from './apiClient';

export const uploadFiles = (
  sessionId: string,
  files: File[],
  onProgress?: (percent: number) => void,
): Promise<UploadedFileInfo[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return apiClient.post<UploadedFileInfo[]>(`/sessions/${sessionId}/files`, formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
};

export const deleteFile = (sessionId: string, fileId: string): Promise<void> =>
  apiClient.delete(`/sessions/${sessionId}/files/${fileId}`);
