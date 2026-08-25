import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { fileApi } from '@/api/fileApi';
import { planFileAdditions } from '@/utils/uploadValidation';

import { sessionDetailQueryKey, useSessionDetail } from './useSessionDetail';

export {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_TOTAL_BYTES,
} from '@/utils/uploadValidation';

/** Session-level attachments per the backend contract: files live on the session
 *  (POST /sessions/{id}/files) and surface through SessionDetail.files. Count, size
 *  and extension limits are validated client-side before anything is uploaded. */
export function useFileAttachments(sessionId: string) {
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { data: detail } = useSessionDetail(sessionId);
  const attachments = detail.files;

  async function addFiles(files: Iterable<File>) {
    const plan = planFileAdditions(attachments, files);
    setError(plan.error);

    if (plan.accepted.length > 0) {
      await fileApi.uploadFiles(sessionId, plan.accepted);
      await queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    }
  }

  async function removeFile(fileId: string) {
    await fileApi.deleteFile(sessionId, fileId);
    setError('');
    await queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
  }

  return { attachments, error, addFiles, removeFile };
}
