import axios from 'axios';

import { getTranslations } from '@/i18n/useTranslations';

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
export function describeLoadError(error: Error): { heading: string; detail: string } {
  const t = getTranslations().errors;
  if (axios.isAxiosError(error) && error.response === undefined) {
    return { heading: t.offlineHeading, detail: t.offlineDetail };
  }
  return { heading: t.loadFailedHeading, detail: error.message };
}

/** What to tell the user about a failed action (mutation). The backend's own
 *  `{ code, message }` wins; a backend that is not answering gets named; anything
 *  else falls back to "not ready yet" — per the decision that nothing is disabled
 *  up front, the error is how the user learns an endpoint has not landed. */
export function describeActionError(error: unknown): string {
  const t = getTranslations().errors;
  if (axios.isAxiosError(error)) {
    if (error.response === undefined) {
      return t.offlineAction;
    }
    const body = error.response.data as { message?: string } | undefined;
    if (body?.message) {
      return body.message;
    }
  }
  return t.notReady;
}
