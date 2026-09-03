import { useQuery } from '@tanstack/react-query';

import { DIRECTORY_SEARCH_MIN_LENGTH, searchDirectory } from '@/api/directoryApi';

export const directorySearchQueryKey = (key: string) => {
  return ['directory', key] as const;
};

/** Recipients matching `key`, or nothing at all until the key is long enough.
 *
 *  Not a suspense query: this runs as the user types, and suspending would tear the
 *  dialog's field out from under them on every keystroke. The pending state belongs on
 *  the field itself (a spinner in the Select), which is what `isFetching` feeds. */
export const useDirectorySearch = (key: string) => {
  const trimmed = key.trim();
  const enabled = trimmed.length >= DIRECTORY_SEARCH_MIN_LENGTH;

  const { data, isFetching, isError } = useQuery({
    queryKey: directorySearchQueryKey(trimmed),
    queryFn: ({ signal }) => searchDirectory(trimmed, signal),
    enabled,
    // The org directory does not change while a dialog is open.
    staleTime: 5 * 60 * 1000,
  });

  // The shape is `searchDirectory`'s business — it owns the envelope, and it raises on a
  // body it cannot read, so a bad response arrives here as an error rather than as an
  // empty list. Narrowing again here would have swallowed that back into "no match".
  return {
    entries: data ?? [],
    isSearching: enabled && isFetching,
    /** The search could not be run. Distinct from "no match", which is an answer. */
    isError,
    enabled,
  };
};
