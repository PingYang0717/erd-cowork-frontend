import axios from 'axios';

import { useAccessDeniedStore } from '@/stores/useAccessDeniedStore';

/** Records a refusal if this failure was one.
 *
 *  Keyed on the **status**, not on the code. `ACCESS_DENIED` and `ENTITLEMENT_DENIED` are
 *  the two the backend sends today, but a 403 that arrived with no code — or with one
 *  added after this was written — is still the account being refused, and the account
 *  being refused is the thing that has to lock the app. Matching a code list here would
 *  mean a new code silently degrading to a toast on a screen where nothing works.
 *
 *  Lives in its own module rather than in `apiClient`: the agent stream reaches the
 *  network through raw `fetch` and imports `apiClient` for the base URL, so putting this
 *  there would have both transports importing in a circle.
 */
export const noteAccessDenial = (status: number, code: string | null, message: string): void => {
  if (status !== 403) {
    return;
  }
  useAccessDeniedStore.getState().deny({ code, message });
};

/** Whether this failure is the account being refused.
 *
 *  Callers that report a failure to the user check this and stay quiet: `AccessDeniedGate`
 *  is already saying it, with the backend's own explanation and at full size. A toast
 *  underneath is a second, worse telling of the same thing — and one nobody can read,
 *  since the overlay covers it. The same reasoning `isCanceled` gets: not every rejected
 *  promise is a failure to report. */
export const isAccessDenied = (error: unknown): boolean => axios.isAxiosError(error) && error.response?.status === 403;

/** Records a refusal that rode axios, digging the backend's `{ code, message }` out of the
 *  response body. This is the interceptor's way in; the agent stream, which has the parsed
 *  body already, calls `noteAccessDenial` direct. */
export const noteIfAccessDenied = (error: unknown): void => {
  if (!axios.isAxiosError(error) || error.response === undefined) {
    return;
  }

  const body = error.response.data as { code?: unknown; message?: unknown } | undefined;
  noteAccessDenial(
    error.response.status,
    typeof body?.code === 'string' ? body.code : null,
    typeof body?.message === 'string' ? body.message : ''
  );
};
