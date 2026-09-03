import { useSuspenseQuery } from '@tanstack/react-query';

import { listSessions } from '@/api/sessionApi';

export const sessionsQueryKey = ['sessions'] as const;

export const useSessions = () => {
  return useSuspenseQuery({
    queryKey: sessionsQueryKey,
    queryFn: listSessions,
  });
};
