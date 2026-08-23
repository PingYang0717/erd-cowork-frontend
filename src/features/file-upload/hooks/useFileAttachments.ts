import { useState } from 'react';

import type { Upload } from '@/types/api';

import { useCreateUpload } from './useCreateUpload';

export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_ATTACHMENT_TOTAL_BYTES = 5 * 1024 * 1024 * 1024;

interface FileLike {
  name: string;
  size: number;
}

export function useFileAttachments() {
  const [attachments, setAttachments] = useState<Upload[]>([]);
  const [error, setError] = useState('');
  const createUpload = useCreateUpload();

  async function addFiles(files: Iterable<FileLike>) {
    const existingNames = new Set(attachments.map((a) => a.fileName));
    let count = attachments.length;
    let total = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);

    const accepted: FileLike[] = [];
    const rejections: string[] = [];

    for (const file of Array.from(files)) {
      if (existingNames.has(file.name)) {
        continue;
      }
      if (count >= MAX_ATTACHMENT_COUNT) {
        rejections.push(`Max ${MAX_ATTACHMENT_COUNT} files`);
        break;
      }
      if (total + file.size > MAX_ATTACHMENT_TOTAL_BYTES) {
        rejections.push('Total size limit is 5 GB');
        break;
      }
      accepted.push(file);
      existingNames.add(file.name);
      count += 1;
      total += file.size;
    }

    setError(rejections.join(' · '));

    for (const file of accepted) {
      const upload = await createUpload.mutateAsync({ fileName: file.name, sizeBytes: file.size });
      setAttachments((prev) => [...prev, upload]);
    }
  }

  function removeFile(fileName: string) {
    setAttachments((prev) => prev.filter((a) => a.fileName !== fileName));
    setError('');
  }

  function clear() {
    setAttachments([]);
    setError('');
  }

  return { attachments, error, addFiles, removeFile, clear };
}
