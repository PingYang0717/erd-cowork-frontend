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
    // so nothing here goes stale on its own. Every mutation that can change a detail
    // invalidates the key it changed BY NAME (send/upload/data-source/rename) — list
    // mutations deliberately do not cascade here, since `['sessions']` is this key's
    // prefix and a non-exact invalidate would re-download the open thread for a rename
    // of some other session (see useSessionMutations).
    staleTime: Infinity,
  });
}
