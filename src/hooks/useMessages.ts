import { useSuspenseQuery } from '@tanstack/react-query';

import { messageApi } from '@/api/messageApi';

export function messagesQueryKey(sessionId: string) {
  return ['sessions', sessionId, 'messages'] as const;
}

/** The thread's messages. Takes a session that definitely exists — callers already
 *  branch on "no session selected" and render an empty state instead, so there is no
 *  disabled state left for this hook to model. */
export function useMessages(sessionId: string) {
  return useSuspenseQuery({
    queryKey: messagesQueryKey(sessionId),
    queryFn: () => messageApi.listMessages(sessionId),
  });
}
