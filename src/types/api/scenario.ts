export type ScenarioKey = 'spc' | 'inline' | 'daily' | 'cptest';

export interface Scenario {
  key: ScenarioKey;
  title: string;
}
