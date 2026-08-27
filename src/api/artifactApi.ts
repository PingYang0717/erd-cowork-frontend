import type { Artifact, ArtifactTheme, DirectoryEntry } from '@/types/api/index';

import { apiClient } from './apiClient';

/** Stubs for the two reads the backend has not built yet (ADR-0009). They are the
 *  fixtures the mock backend used to serve, verbatim: the Gallery's four filters and
 *  three sorts only mean something against data that varies. Nothing writes to them —
 *  every control that would is disabled — so a plain constant is the whole story. */
const STUB_ARTIFACTS: Artifact[] = [
  {
    id: 'artifact-1',
    title: 'SPC analysis — Vt (gate CD)',
    sessionId: 'session-1',
    sessionTitle: 'SPC — Vt (gate CD)',
    pinnedAt: null,
    publishedAt: '2026-08-20T09:20:00.000Z',
    createdAt: '2026-08-20T09:15:00.000Z',
    owner: 'u-001',
    ownerDisplay: 'Alex Chen',
    canPin: true,
    canShare: true,
    isOwn: true,
    isShared: false,
    hasPersonalCopy: false,
  },
  {
    id: 'artifact-2',
    title: 'Inline dashboard — W12',
    sessionId: 'session-1',
    sessionTitle: 'SPC — Vt (gate CD)',
    pinnedAt: '2026-08-21T10:05:00.000Z',
    publishedAt: '2026-08-21T10:02:00.000Z',
    createdAt: '2026-08-21T10:00:00.000Z',
    owner: 'u-001',
    ownerDisplay: 'Alex Chen',
    canPin: true,
    canShare: true,
    isOwn: true,
    isShared: false,
    hasPersonalCopy: false,
  },
  {
    id: 'artifact-3',
    title: 'Daily monitor (A14)',
    sessionId: 'session-2',
    sessionTitle: 'Defect pareto — W12',
    pinnedAt: null,
    publishedAt: '2026-08-19T08:35:00.000Z',
    createdAt: '2026-08-19T08:30:00.000Z',
    owner: 'u-002',
    ownerDisplay: 'Alice Wu',
    canPin: true,
    // Not the owner: a shared Artifact cannot be shared onward.
    canShare: false,
    isOwn: false,
    isShared: true,
    hasPersonalCopy: false,
  },
];
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
  /** Stubbed: the backend serves a single Artifact's HTML but has no listing (ADR-0009). */
  listArtifacts: () => Promise.resolve(STUB_ARTIFACTS),

  /** The backend returns the artifact's HTML as text/html directly. `responseType`
   *  is explicit so a document that happens to parse as JSON still arrives as text.
   *  theme is a 前端-only query extension the mock reads; a real backend ignores it
   *  (dark mode swaps in-frame via postMessage, ADR-0001). */
  getContent: (artifactId: string, theme: ArtifactTheme) =>
    apiClient.get<string>(`/artifacts/${artifactId}`, {
      params: { theme },
      responseType: 'text',
    }),

  /** The artifact's source before assembly (text/plain). Read by the chat bubble's
   *  "view HTML" panel, and the text a later turn iterates from. */
  getRawHtml: (artifactId: string, signal?: AbortSignal) =>
    apiClient.get<string>(`/artifacts/${artifactId}/raw`, {
      responseType: 'text',
      signal,
    }),

  /** Toggles the pin. One endpoint, no body: which way it goes is the backend's call,
   *  not something the client asserts from state it may have read a while ago. */
  togglePin: (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/pin`),

  /** Publishing is what makes an Artifact available to other people. The two
   *  directions are split by method rather than a body flag, and the backend stamps
   *  `publishedAt` itself — the client never sends a time it believes it is. */
  publish: (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/publish`),

  /** No UI reaches this yet: unpublishing belongs on the Artifact management page,
   *  which does not exist. The function is here so that page starts from the contract
   *  rather than rediscovering it. */
  unpublish: (id: string) => apiClient.delete<Artifact>(`/artifacts/${id}/publish`),

  // Delete and share have no backend endpoint yet, and no caller: the controls that
  // would reach them are disabled (ADR-0009). They stay as the executable shape of
  // the contract in docs/api/interface.md.
  deleteArtifact: (id: string) => apiClient.delete<void>(`/artifacts/${id}`),

  share: (id: string, targetIds: string[]) =>
    apiClient.post<ArtifactShareResult>(`/artifacts/${id}/share`, {
      targetIds,
    }),

  /** Stubbed: no backend directory endpoint (ADR-0009). Read by the share dialog,
   *  which is itself unreachable while sharing is disabled. */
  listDirectory: () => Promise.resolve(STUB_DIRECTORY),
};
