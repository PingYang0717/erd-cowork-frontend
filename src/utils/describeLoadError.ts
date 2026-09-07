import { errorMessage, httpStatus, isOffline } from '@/api/apiError';
import { getTranslations } from '@/i18n/useTranslations';
import type { Translations } from '@/i18n/zhTW';
import { describeErrorCode, type ErrorCodeContext } from '@/utils/describeErrorCode';

/**
 * What to tell the user about a failed load.
 *
 * Axios reports an unreachable backend as a bare `Network Error`, which reads like a bug
 * in the app rather than what it is — a backend that is not answering. Since the app has
 * no mock to fall back on (ADR-0006), that is the most common failure there is in
 * development, and the one worth naming.
 *
 * `apiClient` sets no timeout (ADR-0007), so `ECONNABORTED` no longer means "took too
 * long" — it is an aborted request. Both land here as a response-less AxiosError and both
 * are, from the user's side, the same thing: nothing came back.
 *
 * No `ErrorCodeContext` here, unlike `describeActionError`. This renders inside an
 * ErrorBoundary's fallback — the last thing standing when something already failed — and
 * reaching the config means reaching the query client, which a boundary mounted above the
 * provider does not have. A card also keeps the backend's own sentence as small print, so
 * a `FILES_EXPIRED` without its day count is still legible here.
 */
export interface LoadErrorCopy {
  heading: string;
  detail: string;
  /** The backend's own sentence, when it sent one and it is not already the detail above.
   *  Rendered as small print: it names the failure in the backend's terms, which is what
   *  someone debugging a screenshot wants and not what the reader should be acting on. */
  technical?: string;
}

export const describeLoadError = (
  error: Error,
  t: Translations['errors'] = getTranslations().errors
): LoadErrorCopy => {
  if (isOffline(error)) {
    return { heading: t.offlineHeading, detail: t.offlineDetail };
  }
  // The backend's own sentence is kept, but underneath: it used to be the detail outright,
  // which is how untranslated server prose ("E11000 duplicate key…") became the main thing
  // a user was told. A card has two lines, so it does not have to choose.
  const technical = errorMessage(error) ?? undefined;
  // Never the same sentence twice: a backend whose message happens to match the copy
  // would otherwise print it as heading, detail, and small print.
  const failed = (detail: string): LoadErrorCopy => ({
    heading: t.loadFailedHeading,
    detail,
    technical: technical === detail ? undefined : technical,
  });

  const byCode = describeErrorCode(error);
  if (byCode !== null) {
    return failed(byCode);
  }
  // No code to look up. The status is worth showing; axios's own sentence around it is
  // not — it arrives as `Request failed with status code 500`, English whatever the
  // interface is set to, and about axios rather than about what the reader should do.
  const status = httpStatus(error);
  if (status !== null) {
    return failed(t.loadFailedDetail(status));
  }
  // Not a request at all. This boundary also catches errors thrown while rendering, and
  // for those the message is the only thing that says what happened.
  return { heading: t.loadFailedHeading, detail: error.message };
};

/** What to tell the user about a failed action (mutation).
 *
 *  The backend's `code` decides the sentence (ADR-0016); its `message` does not appear at
 *  all here, because a toast is one line and there is no room to lead with something the
 *  reader can act on AND keep the server's own phrasing. The error card, which has two
 *  lines, keeps both — see `describeLoadError` above.
 *
 *  A backend that is not answering gets named. After that the status decides:
 *
 *  `context` carries what the copy needs and the error does not: the retention period a
 *  `FILES_EXPIRED` sentence states. Only a component can reach `GET /config`, so the hook
 *  that calls this supplies it — without it that entry falls back to its no-number wording
 *  on every path but the upload modal, which is every path a repair takes.
 *
 *  404 says the thing is gone, and `notFoundCopy` is how the call site names which thing.
 *  It used to share "not ready yet" with 501, from the decision that nothing is disabled
 *  up front, so an error was how a user learned an endpoint had not landed (ADR-0006).
 *  Every endpoint is connected now, so deleting an already-deleted Session was reported
 *  as the backend not being ready — a claim about the wrong thing, and one the reader acts
 *  on by waiting for something that is already there. 501 keeps that wording: it is the
 *  status that actually means unimplemented.
 */
export const describeActionError = (error: unknown, notFoundCopy?: string, context: ErrorCodeContext = {}): string => {
  const t = getTranslations().errors;
  if (isOffline(error)) {
    return t.offlineAction;
  }
  const byCode = describeErrorCode(error, context);
  if (byCode !== null) {
    return byCode;
  }
  const status = httpStatus(error);
  // Only the caller knows what was missing — a Session, an Artifact, a file — so it
  // supplies that sentence. Without one this says the thing is gone, which is all a 404
  // supports; it deliberately no longer says the endpoint is unbuilt.
  if (status === 404) {
    return notFoundCopy ?? t.noLongerExists;
  }
  if (status === 501) {
    return t.notReady;
  }
  return status === null ? t.actionFailed : t.actionFailedWithStatus(status);
};
