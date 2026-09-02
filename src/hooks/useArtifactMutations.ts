import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  publishArtifact,
  toggleArtifactPin,
  unpublishArtifact,
  updateArtifactShares,
} from '@/api/artifactApi';
import type { Artifact, ArtifactShareUpdate } from '@/types/api/index';

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
    onSuccess: (updated, id) => {
      // The row is found by the id we asked about, not by one read back out of the
      // answer. A response that omits `id` — or wraps it — matched nothing, so the merge
      // silently rewrote no row at all and the button never moved. We already know which
      // Artifact was toggled: it is the argument.
      //
      // Merged onto the cached row rather than written over it, because nothing promises
      // the answer carries every field, and a row that silently loses one is a row the UI
      // then reads wrongly. Whatever the response does bring wins; the rest stays.
      //
      // `pinnedAt` is read defensively for the same reason: if the answer does not carry
      // it, flip the local value rather than leave the row unchanged — the request
      // succeeded, so the state did change, and showing the old one would be a lie.
      queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
        previous?.map((artifact) => {
          if (artifact.id !== id) {
            return artifact;
          }
          const merged = { ...artifact, ...updated, id };
          return updated?.pinnedAt === undefined
            ? { ...merged, pinnedAt: artifact.pinnedAt === null ? new Date().toISOString() : null }
            : merged;
        }),
      );
      // No invalidate to follow it: the merge above already holds everything the toggle
      // changed, and the rail's badge keeps this list mounted on every page — a refetch
      // here was one full list download per pin, anywhere in the app.
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
      // asking for what is already in hand. Guarded, because a body that is not a list
      // (an envelope, an error rendered as JSON) must fall back to a refetch rather than
      // be written into the cache as-is.
      if (Array.isArray(result)) {
        queryClient.setQueryData(artifactSharesQueryKey(id), result);
        // `isShared` lives on the Artifact row, and the list in hand is what decides it.
        queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
          previous?.map((artifact) =>
            artifact.id === id ? { ...artifact, isShared: result.length > 0 } : artifact,
          ),
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
