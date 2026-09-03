import { errorMessage, httpStatus, isOffline } from '@/api/apiError';
import { getTranslations } from '@/i18n/useTranslations';
import type { Translations } from '@/i18n/zhTW';

/** Whether the backend answered "this is not here" as opposed to failing to answer.
 *
 *  Only a 404 says the thing is gone. A 500, a timeout or an unreachable backend say
 *  nothing about whether it exists — telling the reader it was deleted on the strength of
 *  those is stating something the client cannot know, and it is the kind of claim someone
 *  acts on by giving up looking for it.
 */
export const isNotFoundError = (error: unknown): boolean => httpStatus(error) === 404;

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
 */
export const describeLoadError = (
  error: Error,
  t: Translations['errors'] = getTranslations().errors,
): { heading: string; detail: string } => {
  if (isOffline(error)) {
    return { heading: t.offlineHeading, detail: t.offlineDetail };
  }
  // The backend's own words first, the same rule `describeActionError` follows: it is
  // the only party that knows why it refused, and a status code is a poor substitute for
  // a sentence it already wrote. This used to be skipped here, so a load that failed with
  // a reason attached was reported as a bare number.
  const backendMessage = errorMessage(error);
  if (backendMessage !== null) {
    return { heading: t.loadFailedHeading, detail: backendMessage };
  }
  // Nothing readable came back. The status is worth showing; axios's own sentence around
  // it is not — it arrives as `Request failed with status code 500`, English whatever the
  // interface is set to, and about axios rather than about what the reader should do.
  const status = httpStatus(error);
  if (status !== null) {
    return { heading: t.loadFailedHeading, detail: t.loadFailedDetail(status) };
  }
  // Not a request at all. This boundary also catches errors thrown while rendering, and
  // for those the message is the only thing that says what happened.
  return { heading: t.loadFailedHeading, detail: error.message };
};

/** What to tell the user about a failed action (mutation).
 *
 *  The backend's own `{ code, message }` wins — it knows what went wrong. A backend that
 *  is not answering gets named. After that the status decides:
 *
 *  "Not ready yet" is only true of a status that means *no such endpoint*. It used to be
 *  the catch-all, from the decision that nothing is disabled up front, so the error was
 *  how a user learned an endpoint had not landed (ADR-0006). Every endpoint is connected
 *  now, so a 500 or a 403 under that wording told the reader the feature was unbuilt when
 *  what actually happened was a server error or a refusal — a specific claim on a generic
 *  failure, and one they act on by waiting for something that is already there.
 */
export const describeActionError = (error: unknown): string => {
  const t = getTranslations().errors;
  if (isOffline(error)) {
    return t.offlineAction;
  }
  const message = errorMessage(error);
  if (message !== null) {
    return message;
  }
  const status = httpStatus(error);
  if (status === 404 || status === 501) {
    return t.notReady;
  }
  return status === null ? t.actionFailed : t.actionFailedWithStatus(status);
};
