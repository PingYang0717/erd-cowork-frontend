import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { errorMessage, isOffline } from '@/api/apiError';
import { deleteFile, uploadFiles, type UploadProgress } from '@/api/fileApi';
import { useActionErrorToast } from '@/hooks/useActionErrorToast';
import { planFileAdditions } from '@/utils/uploadValidation';
import { sessionDetailQueryKey, useSessionDetail } from './useSessionDetail';

export {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_TOTAL_BYTES,
  MAX_ATTACHMENT_TOTAL_LABEL,
} from '@/utils/uploadValidation';
import { getTranslations } from '@/i18n/useTranslations';

/** Session-level attachments per the backend contract: files live on the session
 *  (POST /sessions/{id}/files) and surface through SessionDetail.files. Count, size
 *  and extension limits are validated client-side before anything is uploaded. */
export const useFileAttachments = (sessionId: string) => {
  const [error, setError] = useState('');
  /** The upload in flight, or null when nothing is uploading. A CSV here runs to
   *  gigabytes — without this the modal is frozen for minutes. Carries a phase, not
   *  only a percent: bytes-all-sent and server-still-working are different waits and
   *  the modal says which one it is. */
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  /** A removal in flight. Uploading has `uploadPercent` to say so; removing has no
   *  progress to report, only the fact that it is happening. */
  const [isRemoving, setIsRemoving] = useState(false);
  const toastError = useActionErrorToast();
  const queryClient = useQueryClient();
  const { data: detail } = useSessionDetail(sessionId);
  const attachments = detail.files;

  const addFiles = async (files: Iterable<File>) => {
    const plan = planFileAdditions(attachments, files);
    setError(plan.error);

    if (plan.accepted.length === 0) {
      return;
    }

    setUploadProgress({ percent: 0, phase: 'transferring' });
    try {
      await uploadFiles(sessionId, plan.accepted, setUploadProgress);
      await queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    } catch (uploadError) {
      // The backend's own reason first ("single file exceeds 2 GB") — it was being
      // thrown away for the generic sentence. Offline gets named; only a reason-less
      // failure falls back to the generic wording.
      const t = getTranslations();
      setError(errorMessage(uploadError) ?? (isOffline(uploadError) ? t.errors.offlineAction : t.files.uploadFailed));
    } finally {
      setUploadProgress(null);
    }
  };

  const removeFile = async (fileId: string) => {
    setIsRemoving(true);
    try {
      await deleteFile(sessionId, fileId);
      setError('');
      await queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    } catch (removeError) {
      // Failing silently left the chip on screen with nothing changed and nothing
      // said — the one mutation in the app whose failure the user never heard about.
      toastError(removeError);
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    attachments,
    error,
    uploadProgress,
    /** True while the session's file set is being written to, either way. A question sent
     *  in this window would be answered against a set that is still changing under it. */
    isMutating: uploadProgress !== null || isRemoving,
    addFiles,
    removeFile,
  };
};
