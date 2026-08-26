import { useSuspenseQuery } from '@tanstack/react-query';

import { type AppConfig, configApi } from '@/api/configApi';

/** The backend's public limits. Deployment-level facts that do not change while the tab
 *  is open, so this never goes stale on its own. */
export function useAppConfig(): AppConfig {
  const { data } = useSuspenseQuery({
    queryKey: ['appConfig'] as const,
    queryFn: configApi.getConfig,
    staleTime: Infinity,
  });
  return data;
}
