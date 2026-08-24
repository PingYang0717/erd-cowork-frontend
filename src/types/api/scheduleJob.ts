import type { ScenarioKey } from './scenario';

export type ScheduleJobStatus = 'Active' | 'Paused';

export interface ScheduleJob {
  id: string;
  title: string;
  cadence: string;
  lastRunAt: string;
  status: ScheduleJobStatus;
  scenario: ScenarioKey;
}
