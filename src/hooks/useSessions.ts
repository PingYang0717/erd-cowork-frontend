import { useQuery } from '@tanstack/react-query';

import { sessionApi } from '@/api/sessionApi';

export const sessionsQueryKey = ['sessions'] as const;

export function useSessions() {
  return useQuery({
    queryKey: sessionsQueryKey,
    queryFn: sessionApi.listSessions,
  });
}
