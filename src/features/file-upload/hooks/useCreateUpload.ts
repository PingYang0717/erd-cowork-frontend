import { useMutation } from '@tanstack/react-query';

import { uploadApi } from '../api/uploadApi';

export function useCreateUpload() {
  return useMutation({
    mutationFn: uploadApi.createUpload,
  });
}
