import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteArtifact,
  publishArtifact,
  shareArtifact,
  toggleArtifactPin,
  unpublishArtifact,
} from '@/api/artifactApi';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
import type { Artifact } from '@/types/api/index';

import { useActionErrorToast } from './useActionErrorToast';
import { artifactContentQueryKey } from './useArtifactContent';
import { artifactsQueryKey } from './useArtifacts';

/** Pinning is a toggle the backend resolves — the caller says which Artifact, not
 *  which direction. */
export function useToggleArtifactPin() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => toggleArtifactPin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();
  const clearPickedArtifact = useActiveRunStore((store) => store.clearPickedArtifact);
  const setDisplayedArtifactId = useActiveRunStore((store) => store.setDisplayedArtifactId);

  return useMutation({
    mutationFn: (id: string) => deleteArtifact(id),
    onSuccess: (_result, deletedId) => {
      // Same order as useDeleteSession, for the same reason: drop it from the list
      // first, move anything pointing at it off, then discard what is cached about it.
      queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (previous) =>
        previous?.filter((artifact) => artifact.id !== deletedId),
      );

      // The Studio panel and the thread both remember an artifact by id. Left pointing
      // at a deleted one, the panel keeps rendering the document from cache — and the
      // next message rides it out as `baseArtifactId`, asking the backend to iterate on
      // something it no longer has.
      const run = useActiveRunStore.getState();
      if (run.pickedArtifactId === deletedId) {
        clearPickedArtifact();
      }
      if (run.displayedArtifactId === deletedId) {
        setDisplayedArtifactId(null);
      }

      // The rendered HTML lives outside the `['artifacts']` prefix on purpose (so pin
      // and publish do not drag a re-download with them), which also means invalidating
      // the list never reaches it. Deleting has to say so explicitly.
      queryClient.removeQueries({ queryKey: artifactContentQueryKey(deletedId) });
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

export function useShareArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: ({ id, targetIds }: { id: string; targetIds: string[] }) =>
      shareArtifact(id, targetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey });
    },
    onError: toastError,
  });
}

/** 發布：把這個 Artifact 開放給別人使用。The mockup calls its button 生成 Artifact;
 *  what it does is publish (see `Artifact.publishedAt`). */
/** Takes an Artifact back off the shelf. Unpublishing revokes access for everyone it
 *  was shared with — publication is what sharing rests on — so the caller is expected to
 *  have said so before reaching here. */
export function useUnpublishArtifact() {
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast();

  return useMutation({
    mutationFn: (id: string) => unpublishArtifact(id),
    onSuccess: () => {
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
