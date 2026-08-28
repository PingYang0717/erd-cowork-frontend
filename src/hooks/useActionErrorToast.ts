import { App } from 'antd';

import { describeActionError } from '@/utils/describeLoadError';

/** Surfaces a failed write to the user as a toast.
 *
 *  Every mutation in the app uses this: nothing is disabled up front (ADR-0006), so the
 *  error message is how a not-yet-landed endpoint tells the user it is not there yet.
 *
 *  `message.error?.` — outside `AppProviders` (component tests) `useApp` returns an empty
 *  object, and a missing toast is better than a crashed test. */
export function useActionErrorToast() {
  const { message } = App.useApp();
  return (error: unknown) => message.error?.(describeActionError(error));
}
