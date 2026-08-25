import type { ScenarioKey } from './scenario';

export type ArtifactKind = 'dashboard' | 'slides';
export type ArtifactTheme = 'light' | 'dark';

export interface Artifact {
  id: string;
  sessionId: string;
  name: string;
  kind: ArtifactKind;
  scenario: ScenarioKey;
  pinned: boolean;
  mine: boolean;
  shared: boolean;
  sharedBy?: string;
  createdAt: string;
  /**
   * 前端-only: whether the user has committed ("生成") this Artifact. A Scenario
   * run produces an ungenerated preview first; generating it is what the mockup
   * marks with the green check, unlocks sharing, and puts it in the rail's
   * Artifacts badge count. Every version IS its own Artifact (see
   * ArtifactVersion), so this is naturally per-version state.
   */
  generated: boolean;
}

/** Backend contract shape (cowork master): a version is an artifact-bearing message,
 *  derived client-side from the session's history — there is no versions endpoint.
 *  `createdAt` and `generated` are 前端-only enrichments for the mockup's menu. */
export interface ArtifactVersion {
  artifactId: string;
  title: string;
  version: number;
  createdAt?: string;
  generated?: boolean;
}
