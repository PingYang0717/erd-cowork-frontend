import type { Artifact, ArtifactTheme, ArtifactVersion, DirectoryEntry } from '@/types/api/index';

import { apiClient } from './apiClient';

export interface ArtifactShareResult {
  url: string;
  artifact: Artifact;
}

export const artifactApi = {
  listArtifacts: () => apiClient.get<Artifact[]>('/artifacts'),

  /** The backend returns the artifact's HTML as text/html directly. theme and
   *  versionId are 前端-only query extensions the mock reads; a real backend
   *  ignores them (dark mode swaps in-frame via postMessage, ADR-0001). */
  getContent: (artifactId: string, theme: ArtifactTheme, versionId?: string) =>
    apiClient.get<string>(`/artifacts/${artifactId}`, {
      params: { theme, versionId },
    }),

  listVersions: (artifactId: string) =>
    apiClient.get<ArtifactVersion[]>(`/artifacts/${artifactId}/versions`),

  setPinned: (id: string, pinned: boolean) =>
    apiClient.patch<Artifact>(`/artifacts/${id}`, { pinned }),

  deleteArtifact: (id: string) => apiClient.delete<void>(`/artifacts/${id}`),

  share: (id: string, targetIds: string[]) =>
    apiClient.post<ArtifactShareResult>(`/artifacts/${id}/share`, {
      targetIds,
    }),

  regenerate: (id: string) => apiClient.post<ArtifactVersion>(`/artifacts/${id}/regenerate`),

  generateVersion: (id: string, versionId: string) =>
    apiClient.post<ArtifactVersion>(`/artifacts/${id}/versions/${versionId}/generate`),

  listDirectory: () => apiClient.get<DirectoryEntry[]>('/directory'),
};
