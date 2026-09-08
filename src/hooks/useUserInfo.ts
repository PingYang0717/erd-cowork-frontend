import { useQuery } from '@tanstack/react-query';

import { getUserInfo } from '@/api/userApi';

export const userInfoQueryKey = ['userInfo'] as const;

/** Who is signed in, for the header to show.
 *
 *  Deliberately not a suspense query. The header is the one thing that must be on screen
 *  whatever else fails — it carries the only way to change language, and a reader who
 *  cannot read the interface is exactly the one who needs it. A suspending header would
 *  make the whole app wait on a decoration, and a failing one would take the app's own
 *  bar down with it. Undefined simply means the avatar falls back to initials.
 *
 *  Deployment-level, not per-screen: it does not change while the tab is open. */
export const useUserInfo = () => {
  const { data } = useQuery({ queryKey: userInfoQueryKey, queryFn: getUserInfo, staleTime: Infinity });
  return data;
};
