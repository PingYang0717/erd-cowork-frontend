import { apiClient } from '@/services/apiClient';
import type { Artifact, ArtifactTheme, ArtifactVersion, DirectoryEntry } from '@/types/api';

export interface ArtifactContent {
  html: string;
}

export interface ArtifactShareResult {
  url: string;
  artifact: Artifact;
}

// apiClient's response interceptor unwraps `response.data`, so the runtime
// value matches these return types even though axios's own types still say
// `AxiosResponse<T>`.
export const artifactApi = {
  listArtifacts: () => apiClient.get<Artifact[]>('/artifacts') as unknown as Promise<Artifact[]>,

  getContent: (artifactId: string, theme: ArtifactTheme, versionId?: string) =>
    apiClient.get<ArtifactContent>(`/artifacts/${artifactId}`, {
      params: { theme, versionId },
    }) as unknown as Promise<ArtifactContent>,

  listVersions: (artifactId: string) =>
    apiClient.get<ArtifactVersion[]>(`/artifacts/${artifactId}/versions`) as unknown as Promise<
      ArtifactVersion[]
    >,

  setPinned: (id: string, pinned: boolean) =>
    apiClient.patch<Artifact>(`/artifacts/${id}`, { pinned }) as unknown as Promise<Artifact>,

  share: (id: string, targetIds: string[]) =>
    apiClient.post<ArtifactShareResult>(`/artifacts/${id}/share`, {
      targetIds,
    }) as unknown as Promise<ArtifactShareResult>,

  listDirectory: () =>
    apiClient.get<DirectoryEntry[]>('/directory') as unknown as Promise<DirectoryEntry[]>,
};
