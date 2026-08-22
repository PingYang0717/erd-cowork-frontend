import type { ScenarioKey } from '@/types/api/scenario';

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
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  n: number;
  label: string;
  createdAt: string;
}
