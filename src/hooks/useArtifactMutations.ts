import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  publishArtifact,
  toggleArtifactPin,
  unpublishArtifact,
  updateArtifactShares,
} from '@/api/artifactApi';
import { DIRECTORY_ENTRY } from '@/api/directoryApi';
import { readArray } from '@/api/responseContract';
import type { Artifact, ArtifactShareUpdate, DirectoryEntry } from '@/types/api';

import { useActionErrorToast } from './useActionErrorToast';
import { artifactsQueryKey } from './useArtifacts';
import { artifactSharesQueryKey } from './useArtifactShares';

/** Toggles one Artifact's pin.
 *
 *  The response is written straight into the list rather than only invalidating it. The
 *  backend owns the direction, so its answer is the only thing that knows which way the
 *  pin went — waiting for a refetch to find out leaves the button showing the old state
 *  in the meantime, and shows the wrong one entirely if the refetch is slow or fails. */
export function useToggleArtifactPin() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => toggleArtifactPin(id),
    onSuccess: (result, id) => {
      // The answer is not an Artifact — it names its subject `artifactId`, not `id`, and
      // carries only what the toggle settled. So the fields it does bring are applied by
      // name rather than spread: spreading would have put a stray `artifactId` on the
      // row, and matching on `result.id` (which does not exist) found nothing at all,
      // which is why the button used to sit still after a successful pin.
      queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
        previous?.map((artifact) =>
          artifact.id === id
            ? {
                ...artifact,
                pinnedAt: result.pinnedAt,
                owner: result.owner,
                isOwn: result.isOwn,
              }
            : artifact,
        ),
      );
      // No invalidate to follow it: the answer holds everything the toggle changed, and
      // the rail's badge keeps this list mounted on every page — a refetch here was one
      // full list download per pin, anywhere in the app.
    },
    onError: toastError,
  });
}

/** Takes an Artifact off the Gallery's shelf.
 *
 *  Only the list changes. Unpublishing does not destroy anything: the Artifact goes on
 *  living in the conversation that produced it, its HTML is still fetchable, and a panel
 *  showing it stays right where it is. What ends is its listing — so the cached content
 *  and anything pointing at it are deliberately left alone. */
export function useUnpublishArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => unpublishArtifact(id),
    onSuccess: (_result, unpublishedId) => {
      // Dropped from the list synchronously so the Gallery stops showing it on the very
      // next render rather than after the refetch lands.
      queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
        previous?.filter((artifact) => artifact.id !== unpublishedId),
      );
      // No invalidate: the filter above is the whole change — the row is gone, and a
      // refetch would only confirm a list that was just made correct.
    },
    onError: toastError,
  });
}

/** Applies a change to an Artifact's share list. */
export function useUpdateArtifactShares() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: ArtifactShareUpdate }) =>
      updateArtifactShares(id, update),
    onSuccess: (result, { id }) => {
      // The PATCH answers with the new share list, so refetching it right back would be
      // asking for what is already in hand. Read *attempted*, not demanded: this
      // response is genuinely allowed to be something else (a 204, an envelope), and
      // that is a fall-back-to-refetch, not a failure to toast — which is why the
      // contract read happens here in a try rather than in the api module.
      let shares: DirectoryEntry[] | null;
      try {
        shares = readArray(result, { ...DIRECTORY_ENTRY, label: 'the updated share list' });
      } catch {
        shares = null;
      }
      if (shares !== null) {
        queryClient.setQueryData(artifactSharesQueryKey(id), shares);
        // `isShared` lives on the Artifact row, and the list in hand is what decides it.
        const isShared = shares.length > 0;
        queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
          previous?.map((artifact) => (artifact.id === id ? { ...artifact, isShared } : artifact)),
        );
      } else {
        // `refetchType: 'none'` — mark it stale, do not go and get it now. Submitting
        // closes the dialog, but the close happens in the caller's own onSuccess, one
        // step after this: a plain invalidate here caught the query while it was still
        // mounted and fired a request for a list nobody was about to look at. Stale is
        // enough — the dialog refetches when it is next opened.
        queryClient.invalidateQueries({
          queryKey: artifactSharesQueryKey(id),
          refetchType: 'none',
        });
        queryClient.invalidateQueries({ queryKey: artifactsQueryKey, exact: true });
      }
    },
    onError: toastError,
  });
}

export function usePublishArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => publishArtifact(id, title),
    onSuccess: () => {
      // Only the list: publishedAt is metadata. The rendered HTML does not change on
      // publish, and its key lives in its own namespace now (artifactContentQueryKey).
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}
