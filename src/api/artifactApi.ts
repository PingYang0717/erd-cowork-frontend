import type { Artifact, DirectoryEntry } from '@/types/api/index';

import { apiClient } from './apiClient';

/** Stub for the one read the backend has not built yet (ADR-0009): the directory the
 *  share dialog searches. Sharing is disabled, so nothing reaches it — but the dialog
 *  still renders behind that disabled entry point. */
const DEPARTMENT_CODES = [
  'A10INTD1-1',
  'A10INTD1-2',
  'A10INTD2-1',
  'A10INTD2-2',
  'A10PITD1-1',
  'A10PITD1-2',
  'A10YETD1-1',
  'A10DETD1-1',
];

const SECTION_CODES = ['INTD-1', 'INTD-2', 'INTD-3', 'PITD-1', 'PITD-2', 'YETD-1', 'DETD-1'];

const PEOPLE = [
  { account: 'CHXXGHYC', name: '鄭凱宇' },
  { account: 'CHXXABCD', name: '王思涵' },
  { account: 'CHXXKLWU', name: '吳克良' },
  { account: 'CHXXSHLN', name: '林淑惠' },
  { account: 'CHXXYCCN', name: '陳彥志' },
  { account: 'CHXXMHHU', name: '黃明翰' },
  { account: 'CHXXTTLA', name: '賴宗霖' },
  { account: 'CHXXPYHS', name: '許佩雅' },
  { account: 'CHXXCKCH', name: '張家愷' },
  { account: 'CHXXWJKM', name: '金宇真' },
];

const STUB_DIRECTORY: DirectoryEntry[] = [
  ...DEPARTMENT_CODES.map((code) => ({ id: code, kind: 'department' as const, label: code })),
  ...SECTION_CODES.map((code) => ({ id: code, kind: 'section' as const, label: code })),
  ...PEOPLE.map((p) => ({
    id: p.account,
    kind: 'person' as const,
    label: `${p.account} · ${p.name}`,
  })),
];

export interface ArtifactShareResult {
  url: string;
  artifact: Artifact;
}

export const artifactApi = {
  listArtifacts: () => apiClient.get<Artifact[]>('/artifacts').then((res) => res.data),

  /** The backend returns the artifact's HTML as text/html directly. `responseType`
   *  is explicit so a document that happens to parse as JSON still arrives as text.
   *  `r` is a cache-buster carrying the reload nonce, sent only after an actual
   *  reload (nonce > 0) so the initial load stays cache-friendly. */
  getContent: (artifactId: string, reloadNonce: number) =>
    apiClient
      .get<string>(`/artifacts/${encodeURIComponent(artifactId)}`, {
        params: reloadNonce > 0 ? { r: reloadNonce } : undefined,
        responseType: 'text',
      })
      .then((res) => res.data),

  /** The artifact's source before assembly (text/plain). Read by the chat bubble's
   *  "view HTML" panel, and the text a later turn iterates from. */
  getRawHtml: (artifactId: string, signal?: AbortSignal) =>
    apiClient
      .get<string>(`/artifacts/${artifactId}/raw`, {
        responseType: 'text',
        signal,
      })
      .then((res) => res.data),

  /** Toggles the pin. One endpoint, no body: which way it goes is the backend's call,
   *  not something the client asserts from state it may have read a while ago. */
  togglePin: (id: string) =>
    apiClient.post<Artifact>(`/artifacts/${id}/pin`).then((res) => res.data),

  /** Publishing is what makes an Artifact available to other people. The two
   *  directions are split by method rather than a body flag, and the backend stamps
   *  `publishedAt` itself — the client never sends a time it believes it is. */
  publish: (id: string) =>
    apiClient.post<Artifact>(`/artifacts/${id}/publish`).then((res) => res.data),

  /** No UI reaches this yet: unpublishing belongs on the Artifact management page,
   *  which does not exist. The function is here so that page starts from the contract
   *  rather than rediscovering it. */
  unpublish: (id: string) =>
    apiClient.delete<Artifact>(`/artifacts/${id}/publish`).then((res) => res.data),

  // Delete and share have no backend endpoint yet, and no caller: the controls that
  // would reach them are disabled (ADR-0009). They stay as the executable shape of
  // the contract in docs/api/interface.md.
  deleteArtifact: (id: string) => apiClient.delete<void>(`/artifacts/${id}`).then(() => undefined),

  share: (id: string, targetIds: string[]) =>
    apiClient
      .post<ArtifactShareResult>(`/artifacts/${id}/share`, {
        targetIds,
      })
      .then((res) => res.data),

  /** Stubbed: no backend directory endpoint (ADR-0009). Read by the share dialog,
   *  which is itself unreachable while sharing is disabled. */
  listDirectory: () => Promise.resolve(STUB_DIRECTORY),
};
