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
    onSuccess: (updated) => {
      // Merged onto the cached row, not written over it. The answer carries the pin
      // state, but nothing promises it carries every other field — and a row that
      // silently loses one is a row the UI then reads wrongly. Whatever the response
      // does bring wins; the rest stays.
      queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
        previous?.map((artifact) =>
          artifact.id === updated.id ? { ...artifact, ...updated } : artifact,
        ),
      );
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
    mutationFn: ({ id, title }: { id: string; title: string }) => publishArtifact(id, title),
    onSuccess: () => {
      // Only the list: publishedAt is metadata. The rendered HTML does not change on
      // publish, and its key lives in its own namespace now (artifactContentQueryKey).
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}
