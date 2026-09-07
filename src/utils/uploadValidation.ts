import { BYTES_PER_GB, BYTES_PER_MB } from '@/constants/bytes';
import { getTranslations } from '@/i18n/useTranslations';
import type { UploadedFileInfo } from '@/types/api';
import { formatBytes } from '@/utils/formatBytes';

/** The caps the backend enforces, as `GET /config` publishes them.
 *
 *  `singleFileLimits` is keyed by lowercase extension without the dot, and it is the only
 *  list of accepted types: a type the backend starts taking arrives with its own size cap
 *  rather than needing a second whitelist kept in step with it. */
export interface UploadLimits {
  maxFiles: number;
  maxSessionBytes: number;
  singleFileLimits: Record<string, number>;
}

/** What to enforce when the config did not arrive in a usable shape.
 *
 *  `GET /config` is not validated at runtime (ADR-0013), so a body missing
 *  `singleFileLimits` — or carrying it as something other than an object — would leave
 *  the accepted-type list empty and refuse every file. That is the guardrails failing
 *  shut, on a screen where the user can do nothing about it. These are the values the
 *  backend publishes today; they are a floor, not a second source of truth. */
export const DEFAULT_UPLOAD_LIMITS: UploadLimits = {
  maxFiles: 5,
  maxSessionBytes: 5 * BYTES_PER_GB,
  singleFileLimits: { csv: 2 * BYTES_PER_GB, xlsx: 200 * BYTES_PER_MB, xls: 200 * BYTES_PER_MB },
};

/** The caps to enforce: what `GET /config` published, with a default standing in for
 *  anything it left out or sent in a shape this cannot read. */
const withDefaults = (limits: UploadLimits | undefined): UploadLimits => {
  const perType = limits?.singleFileLimits;
  // `!Array.isArray`: an array's typeof is 'object' too, and `Object.keys([])` is empty
  // while `Object.keys(['csv'])` is ['0'] — a list would pass as a limits table and cap
  // a file called `0` at 'csv' bytes.
  const hasTypes =
    typeof perType === 'object' && perType !== null && !Array.isArray(perType) && Object.keys(perType).length > 0;

  return {
    maxFiles:
      typeof limits?.maxFiles === 'number' && limits.maxFiles > 0 ? limits.maxFiles : DEFAULT_UPLOAD_LIMITS.maxFiles,
    maxSessionBytes:
      typeof limits?.maxSessionBytes === 'number' && limits.maxSessionBytes > 0
        ? limits.maxSessionBytes
        : DEFAULT_UPLOAD_LIMITS.maxSessionBytes,
    singleFileLimits: hasTypes ? perType : DEFAULT_UPLOAD_LIMITS.singleFileLimits,
  };
};

/** The accepted extensions, dotted and in the order the backend listed them — for the
 *  picker's `accept` attribute and for the sentence that names them. */
export const acceptedExtensions = (limits: UploadLimits | undefined): string[] =>
  Object.keys(withDefaults(limits).singleFileLimits).map((extension) => `.${extension}`);

export const acceptAttribute = (limits: UploadLimits | undefined): string => acceptedExtensions(limits).join(',');

/** The session total, as the copy states it. */
export const totalLimitLabel = (limits: UploadLimits | undefined): string =>
  formatBytes(withDefaults(limits).maxSessionBytes, 0);

/** The same caps as `UploadLimits`, in the form a screen states them: a count and two
 *  ready-made strings. One value rather than three loose props, so the sentence the modal
 *  shows and the rule that rejects a file are visibly the same set. */
export interface StatedUploadLimits {
  maxFiles: number;
  totalLabel: string;
  accept: string;
}

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
};

export interface FileLike {
  name: string;
  size: number;
}

/** Client-side pre-flight against the session's existing files: the accepted types and
 *  every cap come from `GET /config`, so this refuses exactly what the backend would —
 *  before the bytes go out. Stops at the first count/total violation; a file rejected on
 *  its own merits (unknown type, over its type's cap, duplicate name) only skips itself.
 */
export const planFileAdditions = <T extends FileLike>(
  existing: UploadedFileInfo[],
  incoming: Iterable<T>,
  limits: UploadLimits | undefined
): { accepted: T[]; error: string } => {
  const t = getTranslations().files;
  const { maxFiles, maxSessionBytes, singleFileLimits } = withDefaults(limits);
  // Named once rather than rebuilt per rejected file: the list is the same every time.
  const acceptedList = acceptedExtensions(limits).join(', ');
  const existingNames = new Set(existing.map((file) => file.name));
  let count = existing.length;
  let total = existing.reduce((sum, file) => sum + file.sizeBytes, 0);

  const accepted: T[] = [];
  const rejections: string[] = [];
  const say = (message: string) => {
    if (!rejections.includes(message)) {
      rejections.push(message);
    }
  };

  for (const file of Array.from(incoming)) {
    if (existingNames.has(file.name)) {
      // Said, not silently skipped: re-dragging the same file is usually an attempt
      // to replace it, and "nothing happened" reads as the drop not working at all.
      say(t.duplicateName);
      continue;
    }

    const perTypeLimit = singleFileLimits[extensionOf(file.name)];
    if (perTypeLimit === undefined) {
      say(t.unsupportedType(acceptedList));
      continue;
    }
    // The check the frontend never had. Each type is capped separately — a CSV may run to
    // gigabytes where a spreadsheet may not — so a file can be well under the session
    // total and still be refused. Without this it uploaded in full first.
    if (file.size > perTypeLimit) {
      say(t.fileTooLarge(file.name, formatBytes(perTypeLimit, 0)));
      continue;
    }

    if (count >= maxFiles) {
      rejections.push(t.tooManyFiles(maxFiles));
      break;
    }
    if (total + file.size > maxSessionBytes) {
      rejections.push(t.tooLarge(formatBytes(maxSessionBytes, 0)));
      break;
    }

    accepted.push(file);
    existingNames.add(file.name);
    count += 1;
    total += file.size;
  }

  return { accepted, error: rejections.join(' · ') };
};
