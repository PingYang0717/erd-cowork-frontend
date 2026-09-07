import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { type AppConfig, getConfig } from '@/api/configApi';

const appConfigQuery = {
  queryKey: ['appConfig'] as const,
  queryFn: getConfig,
  staleTime: Infinity,
};

/** The backend's public limits. Deployment-level facts that do not change while the tab
 *  is open, so this never goes stale on its own. */
export const useAppConfig = (): AppConfig => useSuspenseQuery(appConfigQuery).data;

/** The same config for callers that only decorate something with it, and so must not take
 *  on a load state or a failure of their own: undefined until it arrives, never suspends.
 *
 *  `useActionErrorToast` runs inside every mutation in the app. Suspending there would put
 *  a `GET /config` wait — and a `GET /config` failure — in front of the session rail and
 *  the Gallery, for a number that appears in one sentence. Undefined means that sentence
 *  states no number, which is what it did before it could ask at all. */
export const useOptionalAppConfig = (): AppConfig | undefined => useQuery(appConfigQuery).data;
