import { App } from 'antd';

import { isAccessDenied } from '@/api/accessDenied';
import { useOptionalAppConfig } from '@/hooks/useAppConfig';
import { describeActionError } from '@/utils/describeLoadError';

/** Surfaces a failed write to the user as a toast.
 *
 *  Every mutation in the app uses this: nothing is disabled up front (ADR-0006), so the
 *  error is how a user finds out an action could not happen.
 *
 *  `notFoundCopy` is what to say when the backend answers 404. A 404 on its own only
 *  supports "it is gone"; naming what was missing — a conversation, an Artifact, a file —
 *  is something only the call site knows, so it supplies that sentence rather than having
 *  one generic wording stand in for all of them.
 *
 *  `message.error?.` — outside `AppProviders` (component tests) `useApp` returns an empty
 *  object, and a missing toast is better than a crashed test. */
export const useActionErrorToast = (notFoundCopy?: string) => {
  const { message } = App.useApp();
  const config = useOptionalAppConfig();

  return (error: unknown) => {
    // The gate has this one, and says it better. See `isAccessDenied`.
    if (isAccessDenied(error)) {
      return;
    }
    // The retention period travels with the error: a FILES_EXPIRED toast says how many
    // days, and only a component can reach the config that knows.
    message.error?.(describeActionError(error, notFoundCopy, { retentionDays: config?.retentionDays }));
  };
};
