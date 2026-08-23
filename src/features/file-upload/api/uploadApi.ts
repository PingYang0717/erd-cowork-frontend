import { apiClient } from '@/services/apiClient';
import type { Upload } from '@/types/api';

export interface CreateUploadInput {
  fileName: string;
  sizeBytes: number;
}

export const uploadApi = {
  createUpload: (input: CreateUploadInput) => apiClient.post<Upload>('/uploads', input),
};
