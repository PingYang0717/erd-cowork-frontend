import { useQuery } from '@tanstack/react-query';

import { messageApi } from '../api/messageApi';

export function messagesQueryKey(sessionId: string) {
  return ['sessions', sessionId, 'messages'] as const;
}

export function useMessages(sessionId: string | null) {
  return useQuery({
    queryKey: messagesQueryKey(sessionId ?? ''),
    queryFn: () => messageApi.listMessages(sessionId as string),
    enabled: sessionId !== null,
  });
}
