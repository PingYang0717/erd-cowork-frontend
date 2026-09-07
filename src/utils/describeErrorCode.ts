import { errorCode, errorMessage } from '@/api/apiError';
import { getTranslations } from '@/i18n/useTranslations';

/** What to tell the user about a failure the backend put a code on.
 *
 *  The code is the part this client can act on. The `message` beside it names the failure
 *  in the backend's own terms — a duplicate-key violation, a parser stack — which is the
 *  right vocabulary for a server log and the wrong one for the person reading the screen.
 *
 *  Returns null when there is no code, or none this app has a sentence for. Callers fall
 *  back to their own generic wording rather than reaching for the backend's words.
 */
export interface ErrorCodeContext {
  /** `GET /config`'s retention period, when the caller can reach it. Entries that state
   *  a limit read it from here rather than keeping a second copy of the number. */
  retentionDays?: number;
}

/** An entry is a plain sentence, or a function when it states a deployment limit. */
type CodeCopy = string | ((retentionDays: number | null) => string);

/** The lookup on its own, for the one caller that never has an error object: the agent
 *  stream's ERROR event arrives as a bare `{ code, message }` in the middle of a run. */
export const copyForCode = (code: string, context: ErrorCodeContext = {}): string | null => {
  const byCode: Record<string, CodeCopy> = getTranslations().errors.byCode;
  const copy = byCode[code];
  if (copy === undefined) {
    return null;
  }
  return typeof copy === 'function' ? copy(context.retentionDays ?? null) : copy;
};

export const describeErrorCode = (error: unknown, context: ErrorCodeContext = {}): string | null => {
  const code = errorCode(error);
  if (code === null) {
    return null;
  }

  const copy = copyForCode(code, context);
  if (copy !== null) {
    return copy;
  }

  // Only in development, and only when there WAS a code: a code with no entry means the
  // dictionary fell behind the backend, and nothing else in the app would say so — every
  // user just quietly gets the generic sentence. A failure with no code at all is an
  // ordinary transport error, not a gap, and warning on those would bury this.
  if (import.meta.env.DEV) {
    console.warn(
      `[apiError] no copy for backend error code "${code}" — backend said: ${errorMessage(error) ?? '(no message)'}`
    );
  }
  return null;
};
