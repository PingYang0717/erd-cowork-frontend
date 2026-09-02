import type { ScenarioKey, StepItem } from '@/types/api';

interface ScenarioFixture {
  artifactName: string;
  steps: StepItem[];
  reply: string;
}

// A slides request replays its scenario and then adds this step, mirroring
// eRDWorkspace20260819.html's eR(), which appends "Generate slides" to the
// same base step list rather than defining a scenario of its own.
export const SLIDES_STEP: StepItem = {
  stepKey: '4',
  title: 'Generate slides',
  description: 'Title, control chart, Cpk, findings',
  status: 'SUCCESS',
};

export const SCENARIO_FIXTURES: Record<ScenarioKey, ScenarioFixture> = {
  spc: {
    artifactName: 'SPC analysis — Vt (gate CD)',
    steps: [
      {
        stepKey: '1',
        title: 'Connect data source',
        description: 'Inline DB · Vt (gate CD)',
        status: 'SUCCESS',
      },
      {
        stepKey: '2',
        title: 'Compute control limits',
        description: 'CL / ±3σ, apply Western Electric rules',
        status: 'SUCCESS',
      },
      {
        stepKey: '3',
        title: 'Render control chart',
        description: 'Assemble SPC dashboard card',
        status: 'SUCCESS',
      },
    ],
    reply:
      'Done — recomputed control limits and applied Western Electric rules. One out-of-control point remains.',
  },
  inline: {
    artifactName: 'Inline dashboard',
    steps: [
      {
        stepKey: '1',
        title: 'Connect data source',
        description: 'Inline DB · selected DC items',
        status: 'SUCCESS',
      },
      {
        stepKey: '2',
        title: 'Apply query filters',
        description: 'Scan wafer / DC item data',
        status: 'SUCCESS',
      },
      {
        stepKey: '3',
        title: 'Assemble dashboard',
        description: 'Render SPC cards for each item',
        status: 'SUCCESS',
      },
    ],
    reply:
      'First version of the Inline dashboard is ready — review each item’s control chart and OOC wafers.',
  },
  daily: {
    artifactName: 'Daily Monitor Dashboard — A14',
    steps: [
      {
        stepKey: '1',
        title: 'Collect Approval Center data',
        description: 'Hold/Release queue',
        status: 'SUCCESS',
      },
      {
        stepKey: '2',
        title: 'Collect EXP Health data',
        description: 'Flag abnormal parameters',
        status: 'SUCCESS',
      },
      {
        stepKey: '3',
        title: 'Merge Inline SPC data',
        description: 'Assemble daily monitor dashboard',
        status: 'SUCCESS',
      },
    ],
    reply:
      'Daily Monitor Dashboard — A14 generated, merging Approval Center, EXP Health, and Inline SPC data.',
  },
  cptest: {
    artifactName: 'CP Test status',
    steps: [
      {
        stepKey: '1',
        title: 'Connect CP Test data source',
        description: 'Pull submission records',
        status: 'SUCCESS',
      },
      {
        stepKey: '2',
        title: 'Aggregate by status',
        description: 'Group by site and progress',
        status: 'SUCCESS',
      },
      {
        stepKey: '3',
        title: 'Render status dashboard',
        description: 'Assemble CP Test dashboard card',
        status: 'SUCCESS',
      },
    ],
    reply:
      'CP Test status dashboard is ready — see current submissions grouped by site and progress.',
  },
};

/** Keyword match standing in for the backend LLM reading the question. Returns null
 *  when nothing matched, so the caller can fall back to a base artifact's scenario
 *  (iteration) before defaulting. */
export const matchScenario = (text: string): ScenarioKey | null => {
  if (/daily\s*monitor|a14/i.test(text)) {
    return 'daily';
  }
  if (/inline/i.test(text)) {
    return 'inline';
  }
  if (/cp\s*test/i.test(text)) {
    return 'cptest';
  }
  if (/spc/i.test(text)) {
    return 'spc';
  }
  return null;
};
