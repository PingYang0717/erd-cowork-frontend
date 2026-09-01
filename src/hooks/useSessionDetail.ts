import { useSuspenseQuery } from '@tanstack/react-query';

import { getSession } from '@/api/sessionApi';

export function sessionDetailQueryKey(sessionId: string) {
  return ['sessions', sessionId] as const;
}

/** The session's detail — the backend nests messages and files here rather than
 *  serving them from endpoints of their own. Takes a session that definitely exists —
 *  callers already branch on "no session selected" and render an empty state instead,
 *  so there is no disabled state left for this hook to model. */
export function useSessionDetail(sessionId: string) {
  return useSuspenseQuery({
    queryKey: sessionDetailQueryKey(sessionId),
    queryFn: () => getSession(sessionId),
    // A draft session exists only in this cache until its first message upserts it
    // server-side (ADR-0005). A background refetch would 404 and tear the thread down,
    // so nothing here goes stale on its own — every mutation path invalidates the key.
    staleTime: Infinity,
  });
}
