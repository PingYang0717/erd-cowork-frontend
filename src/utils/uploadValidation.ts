import { BYTES_PER_GB } from '@/constants/bytes';
import type { UploadedFileInfo } from '@/types/api';

export const MAX_ATTACHMENT_COUNT = 5;

/** The cap, as one number. The byte limit and the wording shown to the user are both
 *  derived from it, so raising the cap is a single edit — previously the figure was
 *  spelled out again in two pieces of copy, and nothing would have failed if only one of
 *  them had been updated. */
const MAX_ATTACHMENT_TOTAL_GB = 5;
export const MAX_ATTACHMENT_TOTAL_BYTES = MAX_ATTACHMENT_TOTAL_GB * BYTES_PER_GB;
export const MAX_ATTACHMENT_TOTAL_LABEL = `${MAX_ATTACHMENT_TOTAL_GB} GB`;
// The analyses only consume spreadsheet data; the mockup enforces the same
// whitelist on the picker (`accept`) and on dropped files.
export const ACCEPTED_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_FILE_EXTENSIONS.join(',');

function hasAcceptedExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return ACCEPTED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export interface FileLike {
  name: string;
  size: number;
}

/** Client-side pre-flight against the session's existing files: extension whitelist,
 *  dedupe by name, count and total-size caps. Stops at the first count/size violation;
 *  an unsupported extension only skips that file. */
export function planFileAdditions<T extends FileLike>(
  existing: UploadedFileInfo[],
  incoming: Iterable<T>,
): { accepted: T[]; error: string } {
  const existingNames = new Set(existing.map((file) => file.name));
  let count = existing.length;
  let total = existing.reduce((sum, file) => sum + file.sizeBytes, 0);

  const accepted: T[] = [];
  const rejections: string[] = [];

  for (const file of Array.from(incoming)) {
    if (existingNames.has(file.name)) {
      continue;
    }
    if (!hasAcceptedExtension(file.name)) {
      if (!rejections.includes('僅支援 .csv / .xlsx')) {
        rejections.push('僅支援 .csv / .xlsx');
      }
      continue;
    }
    if (count >= MAX_ATTACHMENT_COUNT) {
      rejections.push(`最多 ${MAX_ATTACHMENT_COUNT} 個檔案`);
      break;
    }
    if (total + file.size > MAX_ATTACHMENT_TOTAL_BYTES) {
      rejections.push(`總計上限 ${MAX_ATTACHMENT_TOTAL_LABEL}`);
      break;
    }
    accepted.push(file);
    existingNames.add(file.name);
    count += 1;
    total += file.size;
  }

  return { accepted, error: rejections.join(' · ') };
}
