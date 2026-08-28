import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { deleteFile, uploadFiles } from '@/api/fileApi';
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
  /** How far the upload in flight has got, or null when nothing is uploading. A CSV
   *  here runs to gigabytes — without this the modal is frozen for minutes. */
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { data: detail } = useSessionDetail(sessionId);
  const attachments = detail.files;

  async function addFiles(files: Iterable<File>) {
    const plan = planFileAdditions(attachments, files);
    setError(plan.error);

    if (plan.accepted.length === 0) {
      return;
    }

    setUploadPercent(0);
    try {
      await uploadFiles(sessionId, plan.accepted, setUploadPercent);
      await queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    } catch {
      setError('上傳失敗，請再試一次。');
    } finally {
      setUploadPercent(null);
    }
  }

  async function removeFile(fileId: string) {
    await deleteFile(sessionId, fileId);
    setError('');
    await queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
  }

  return { attachments, error, uploadPercent, addFiles, removeFile };
}
