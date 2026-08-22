import type { MessageStep, ScenarioKey } from '@/types/api';

interface ScenarioFixture {
  artifactName: string;
  steps: MessageStep[];
  reply: string;
}

export const SCENARIO_FIXTURES: Record<ScenarioKey, ScenarioFixture> = {
  spc: {
    artifactName: 'SPC analysis — Vt (gate CD)',
    steps: [
      { key: '1', title: 'Connect data source', description: 'Inline DB · Vt (gate CD)' },
      {
        key: '2',
        title: 'Compute control limits',
        description: 'CL / ±3σ, apply Western Electric rules',
      },
      { key: '3', title: 'Render control chart', description: 'Assemble SPC dashboard card' },
    ],
    reply:
      'Done — recomputed control limits and applied Western Electric rules. One out-of-control point remains.',
  },
  inline: {
    artifactName: 'Inline dashboard',
    steps: [
      {
        key: '1',
        title: 'Connect data source',
        description: 'Inline DB · selected DC items',
      },
      { key: '2', title: 'Apply query filters', description: 'Scan wafer / DC item data' },
      { key: '3', title: 'Assemble dashboard', description: 'Render SPC cards for each item' },
    ],
    reply:
      'First version of the Inline dashboard is ready — review each item’s control chart and OOC wafers.',
  },
  daily: {
    artifactName: 'Daily Monitor Dashboard — A14',
    steps: [
      { key: '1', title: 'Collect Approval Center data', description: 'Hold/Release queue' },
      { key: '2', title: 'Collect EXP Health data', description: 'Flag abnormal parameters' },
      {
        key: '3',
        title: 'Merge Inline SPC data',
        description: 'Assemble daily monitor dashboard',
      },
    ],
    reply:
      'Daily Monitor Dashboard — A14 generated, merging Approval Center, EXP Health, and Inline SPC data.',
  },
  cptest: {
    artifactName: 'CP Test status',
    steps: [
      {
        key: '1',
        title: 'Connect CP Test data source',
        description: 'Pull submission records',
      },
      { key: '2', title: 'Aggregate by status', description: 'Group by site and progress' },
      {
        key: '3',
        title: 'Render status dashboard',
        description: 'Assemble CP Test dashboard card',
      },
    ],
    reply:
      'CP Test status dashboard is ready — see current submissions grouped by site and progress.',
  },
};

export function matchScenario(text: string): ScenarioKey {
  if (/daily\s*monitor|a14/i.test(text)) {
    return 'daily';
  }
  if (/inline/i.test(text)) {
    return 'inline';
  }
  if (/cp\s*test/i.test(text)) {
    return 'cptest';
  }
  return 'spc';
}
