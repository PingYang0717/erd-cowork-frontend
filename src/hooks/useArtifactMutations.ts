import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  pinArtifact,
  publishArtifact,
  unpinArtifact,
  unpublishArtifact,
  updateArtifactShares,
} from '@/api/artifactApi';
import type { Artifact, ArtifactShareUpdate } from '@/types/api/index';

import { useActionErrorToast } from './useActionErrorToast';
import { artifactsQueryKey } from './useArtifacts';
import { artifactSharesQueryKey } from './useArtifactShares';

/** Pins or releases one Artifact. The caller says which direction — a toggle resolved by
 *  the backend left no way to express "unpin", so a pinned Artifact could never be
 *  released. */
export function useSetArtifactPinned() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      pinned ? pinArtifact(id) : unpinArtifact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
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
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
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
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: artifactSharesQueryKey(id) });
      // `isShared` lives on the Artifact, so the list has to hear about it too.
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

export function usePublishArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => publishArtifact(id),
    onSuccess: () => {
      // Only the list: publishedAt is metadata. The rendered HTML does not change on
      // publish, and its key lives in its own namespace now (artifactContentQueryKey).
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}
