import { useQuery } from '@tanstack/react-query';

import { DIRECTORY_SEARCH_MIN_LENGTH, searchDirectory } from '@/api/directoryApi';

export function directorySearchQueryKey(key: string) {
  return ['directory', key] as const;
}

/** Recipients matching `key`, or nothing at all until the key is long enough.
 *
 *  Not a suspense query: this runs as the user types, and suspending would tear the
 *  dialog's field out from under them on every keystroke. The pending state belongs on
 *  the field itself (a spinner in the Select), which is what `isFetching` feeds. */
export function useDirectorySearch(key: string) {
  const trimmed = key.trim();
  const enabled = trimmed.length >= DIRECTORY_SEARCH_MIN_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: directorySearchQueryKey(trimmed),
    queryFn: ({ signal }) => searchDirectory(trimmed, signal),
    enabled,
    // The org directory does not change while a dialog is open.
    staleTime: 5 * 60 * 1000,
  });

  return { entries: data ?? [], isSearching: enabled && isFetching, enabled };
}
