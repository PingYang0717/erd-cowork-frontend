import { useFestiveStore } from '@/stores/useFestiveStore';
import { currentFestival, type Festival } from '@/utils/festival';

/** The festival the interface is dressed for right now, or none: the switch in the
 *  avatar menu first — off means off, whatever the calendar or a preview key says —
 *  then the calendar (CONTEXT.md, 節慶裝飾). Read per render rather than memoised: a
 *  preview key set in devtools should show on the next paint, and the check is a
 *  handful of date arithmetic. One answer for every surface that dresses up — the
 *  header's scene, the avatar, and the session rail's echoes of them. */
export const useFestival = (): Festival | null => {
  const enabled = useFestiveStore((state) => state.enabled);
  return enabled ? currentFestival() : null;
};
