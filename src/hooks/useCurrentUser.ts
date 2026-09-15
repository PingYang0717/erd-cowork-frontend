import { useQuery } from '@tanstack/react-query';

import { getUserInfo } from '@/api/directoryApi';
import type { DirectoryEntry } from '@/types/api';

export const currentUserQueryKey = ['hr', 'userInfo'] as const;

/** Who is signed in, as the HR directory describes them — the same `DirectoryEntry` the
 *  share picker reads, so their photo and name are drawn the same way.
 *
 *  Asked once, when the app starts: the header mounts above every route, so its request
 *  is the first thing the app does, and the answer is kept for the whole visit.
 *
 *  Not a suspense query (the documented exception, AGENTS.md): the header has to paint
 *  whether or not the profile answers. A slow or failed profile degrades the avatar to a
 *  generic figure; it must not suspend the header or replace it with an error card,
 *  because the header is where the language exit lives. */
export const useCurrentUser = (): DirectoryEntry | undefined => {
  const { data } = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => getUserInfo(signal),
    staleTime: Infinity,
  });
  return data;
};
