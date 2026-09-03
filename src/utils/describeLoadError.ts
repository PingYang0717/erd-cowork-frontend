import { errorMessage, httpStatus, isOffline } from '@/api/apiError';
import { getTranslations } from '@/i18n/useTranslations';
import type { Translations } from '@/i18n/zhTW';

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
/** Whether the backend answered "this is not here" as opposed to failing to answer.
 *
 *  Only a 404 says the thing is gone. A 500, a timeout or an unreachable backend say
 *  nothing about whether it exists — telling the reader it was deleted on the strength of
 *  those is stating something the client cannot know, and it is the kind of claim someone
 *  acts on by giving up looking for it.
 */
export const isNotFoundError = (error: unknown): boolean => httpStatus(error) === 404;

export const describeLoadError = (
  error: Error,
  t: Translations['errors'] = getTranslations().errors,
): { heading: string; detail: string } => {
  if (isOffline(error)) {
    return { heading: t.offlineHeading, detail: t.offlineDetail };
  }
  // The status code is worth showing; axios's own sentence around it is not. It arrives
  // as `Request failed with status code 500` — English whatever the interface is set to,
  // and about axios rather than about what the user should do next.
  const status = httpStatus(error);
  if (status !== null) {
    return { heading: t.loadFailedHeading, detail: t.loadFailedDetail(status) };
  }
  return { heading: t.loadFailedHeading, detail: error.message };
};

/** What to tell the user about a failed action (mutation). The backend's own
 *  `{ code, message }` wins; a backend that is not answering gets named; anything
 *  else falls back to "not ready yet" — per the decision that nothing is disabled
 *  up front, the error is how the user learns an endpoint has not landed. */
export const describeActionError = (error: unknown): string => {
  const t = getTranslations().errors;
  if (isOffline(error)) {
    return t.offlineAction;
  }
  const message = errorMessage(error);
  if (message !== null) {
    return message;
  }
  return t.notReady;
};
