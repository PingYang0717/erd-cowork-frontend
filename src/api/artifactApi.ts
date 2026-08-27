import type { Artifact, ArtifactTheme, DirectoryEntry } from '@/types/api/index';

import { apiClient } from './apiClient';

/** Stubs for the two reads the backend has not built yet (ADR-0009). They are the
 *  fixtures the mock backend used to serve, verbatim: the Gallery's four filters and
 *  three sorts only mean something against data that varies. Nothing writes to them —
 *  every control that would is disabled — so a plain constant is the whole story. */
const STUB_ARTIFACTS: Artifact[] = [
  {
    id: 'artifact-1',
    sessionId: 'session-1',
    name: 'SPC analysis — Vt (gate CD)',
    kind: 'dashboard',
    scenario: 'spc',
    pinned: false,
    mine: true,
    shared: false,
    createdAt: '2026-08-20T09:15:00.000Z',
    generated: true,
  },
  {
    id: 'artifact-2',
    sessionId: 'session-1',
    name: 'Inline dashboard — W12',
    kind: 'dashboard',
    scenario: 'inline',
    pinned: true,
    mine: true,
    shared: false,
    createdAt: '2026-08-21T10:00:00.000Z',
    generated: true,
  },
  {
    id: 'artifact-3',
    sessionId: 'session-2',
    name: 'Daily monitor (A14)',
    kind: 'slides',
    scenario: 'daily',
    pinned: false,
    mine: false,
    shared: false,
    sharedBy: 'Alice Wu',
    createdAt: '2026-08-19T08:30:00.000Z',
    generated: true,
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

  // Everything from here to `listDirectory` has no backend endpoint yet, and no caller:
  // the controls that would reach them are disabled (ADR-0009). They stay as the
  // executable shape of the contract in docs/api/interface.md — the day an endpoint
  // lands, the UI drops one `disabled` and these are already right.
  setPinned: (id: string, pinned: boolean) =>
    apiClient.patch<Artifact>(`/artifacts/${id}`, { pinned }),

  deleteArtifact: (id: string) => apiClient.delete<void>(`/artifacts/${id}`),

  share: (id: string, targetIds: string[]) =>
    apiClient.post<ArtifactShareResult>(`/artifacts/${id}/share`, {
      targetIds,
    }),

  /** 前端-only（mock）：把這個 Artifact 標記為已生成。 */
  generate: (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/generate`),

  /** Stubbed: no backend directory endpoint (ADR-0009). Read by the share dialog,
   *  which is itself unreachable while sharing is disabled. */
  listDirectory: () => Promise.resolve(STUB_DIRECTORY),
};
