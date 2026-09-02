import { useSuspenseQuery } from '@tanstack/react-query';

import { type AppConfig, getConfig } from '@/api/configApi';

/** The backend's public limits. Deployment-level facts that do not change while the tab
 *  is open, so this never goes stale on its own. */
export const useAppConfig = (): AppConfig => {
  const { data } = useSuspenseQuery({
    queryKey: ['appConfig'] as const,
    queryFn: getConfig,
    staleTime: Infinity,
  });
  return data;
};
