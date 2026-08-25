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
   * Derived server-side: whether any of this Artifact's versions has been
   * generated. The rail's Artifacts badge counts only generated Artifacts —
   * an ungenerated preview is not yet "in" the Artifacts list.
   */
  generated: boolean;
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  n: number;
  label: string;
  createdAt: string;
  /**
   * Whether the user has committed ("生成") this version. A Scenario run or a
   * regenerate produces an ungenerated preview first; generating it is what
   * the mockup's version menu marks with the green "published" check, and it
   * is what unlocks sharing. Per-version by design — switching versions must
   * not inherit another version's state.
   */
  generated: boolean;
}
