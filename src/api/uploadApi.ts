import type { Upload } from '@/types/api/index';

import { apiClient } from './apiClient';

export interface CreateUploadInput {
  fileName: string;
  sizeBytes: number;
}

export const uploadApi = {
  createUpload: (input: CreateUploadInput) => apiClient.post<Upload>('/uploads', input),
};
