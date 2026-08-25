import type { Artifact, ArtifactTheme, DirectoryEntry } from '@/types/api/index';

import { apiClient } from './apiClient';

export interface ArtifactShareResult {
  url: string;
  artifact: Artifact;
}

export const artifactApi = {
  listArtifacts: () => apiClient.get<Artifact[]>('/artifacts'),

  /** The backend returns the artifact's HTML as text/html directly. theme is a
   *  前端-only query extension the mock reads; a real backend ignores it (dark
   *  mode swaps in-frame via postMessage, ADR-0001). */
  getContent: (artifactId: string, theme: ArtifactTheme) =>
    apiClient.get<string>(`/artifacts/${artifactId}`, {
      params: { theme },
    }),

  setPinned: (id: string, pinned: boolean) =>
    apiClient.patch<Artifact>(`/artifacts/${id}`, { pinned }),

  deleteArtifact: (id: string) => apiClient.delete<void>(`/artifacts/${id}`),

  share: (id: string, targetIds: string[]) =>
    apiClient.post<ArtifactShareResult>(`/artifacts/${id}/share`, {
      targetIds,
    }),

  /** 前端-only（mock）：把這個 Artifact 標記為已生成。 */
  generate: (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/generate`),

  listDirectory: () => apiClient.get<DirectoryEntry[]>('/directory'),
};
