import { BYTES_PER_GB } from '@/constants/bytes';
import { getTranslations } from '@/i18n/useTranslations';
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

const hasAcceptedExtension = (fileName: string) => {
  const lower = fileName.toLowerCase();
  return ACCEPTED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export interface FileLike {
  name: string;
  size: number;
}

/** Client-side pre-flight against the session's existing files: extension whitelist,
 *  dedupe by name, count and total-size caps. Stops at the first count/size violation;
 *  an unsupported extension only skips that file. */
export const planFileAdditions = <T extends FileLike>(
  existing: UploadedFileInfo[],
  incoming: Iterable<T>,
): { accepted: T[]; error: string } => {
  const t = getTranslations().files;
  const existingNames = new Set(existing.map((file) => file.name));
  let count = existing.length;
  let total = existing.reduce((sum, file) => sum + file.sizeBytes, 0);

  const accepted: T[] = [];
  const rejections: string[] = [];

  for (const file of Array.from(incoming)) {
    if (existingNames.has(file.name)) {
      // Said, not silently skipped: re-dragging the same file is usually an attempt
      // to replace it, and "nothing happened" reads as the drop not working at all.
      // The other three rejections all speak; this one was the only mute.
      if (!rejections.includes(t.duplicateName)) {
        rejections.push(t.duplicateName);
      }
      continue;
    }
    if (!hasAcceptedExtension(file.name)) {
      if (!rejections.includes(t.onlySpreadsheets)) {
        rejections.push(t.onlySpreadsheets);
      }
      continue;
    }
    if (count >= MAX_ATTACHMENT_COUNT) {
      rejections.push(t.tooManyFiles(MAX_ATTACHMENT_COUNT));
      break;
    }
    if (total + file.size > MAX_ATTACHMENT_TOTAL_BYTES) {
      rejections.push(t.tooLarge(MAX_ATTACHMENT_TOTAL_LABEL));
      break;
    }
    accepted.push(file);
    existingNames.add(file.name);
    count += 1;
    total += file.size;
  }

  return { accepted, error: rejections.join(' · ') };
};
