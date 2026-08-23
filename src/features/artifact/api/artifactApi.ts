import { apiClient } from '@/services/apiClient';
import type { Artifact, ArtifactTheme, ArtifactVersion, DirectoryEntry } from '@/types/api';

export interface ArtifactContent {
  html: string;
}

export interface ArtifactShareResult {
  url: string;
  artifact: Artifact;
}

export const artifactApi = {
  listArtifacts: () => apiClient.get<Artifact[]>('/artifacts'),

  getContent: (artifactId: string, theme: ArtifactTheme, versionId?: string) =>
    apiClient.get<ArtifactContent>(`/artifacts/${artifactId}`, {
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
