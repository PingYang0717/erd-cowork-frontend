import type { Question, QuestionField, QuestionForm } from '@/types/api/agentEvent';
import type { Connector } from '@/types/api/connector';
import type { DcItem } from '@/types/api/dcItem';
import type { ScenarioKey } from '@/types/api/scenario';

// eRDWorkspace20260819.html:9315
const TIME_RANGES = ['Last 24h', 'Last 7 days', 'Last 30 days', 'Last quarter'];

const PART_IDS = ['A14', 'A14-B', 'N5', 'N5-P', 'N3'];

// eRDWorkspace20260819.html:9561-9571
const CP_ROLES = [
  { value: 'baseline', label: 'INT Baseline', hint: '看整段 flow' },
  { value: 'loop', label: 'INT Loop', hint: '看自己的 loop' },
  { value: 'other', label: '其他', hint: '自行輸入' },
];
const CP_FLOWS = ['整段 flow (全流程)', 'FEOL', 'MEOL', 'BEOL'];
const CP_LOOPS = ['FIN', 'Gate (GT)', 'POV', 'Contact (CT)', 'M1', 'Via1 (V1)'];
const CP_RANGES = [
  { value: 'cp7d', label: '近 7 天' },
  { value: 'cp30d', label: '近 30 天' },
  { value: 'cpq', label: '本季 (Q3)' },
];

const asOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

/** Data type is the one field whose choices are not fixed by the Scenario: it lists the
 *  connectors that are actually connected right now (ADR-0004). With none connected the
 *  mockup still offers Inline, so the form is never a dead end. */
const dataTypeField = (connectors: Connector[]): QuestionField => {
  const connected = connectors.filter((connector) => connector.status === 'connected');
  const names = connected.length > 0 ? connected.map((connector) => connector.name) : ['Inline'];

  return {
    key: 'dataTypes',
    label: 'Data type',
    kind: 'multi',
    required: true,
    options: asOptions(names),
    hint: '可多選,只顯示已連線的來源。',
  };
};

const spcConditions = (connectors: Connector[]): QuestionForm => {
  return {
    formKey: 'spc-conditions',
    title: '分析條件',
    fields: [
      {
        key: 'partIds',
        label: 'Part ID',
        kind: 'multi',
        required: true,
        options: asOptions(PART_IDS),
        placeholder: '輸入關鍵字搜尋,可多選或貼上…',
      },
      {
        key: 'timeRange',
        label: 'Time range',
        kind: 'daterange',
        required: true,
        options: asOptions(TIME_RANGES),
        allowCustom: true,
        placeholder: '或自訂,例如 07/01–07/31、last 3 shifts…',
      },
      dataTypeField(connectors),
    ],
    submitLabel: '送出',
    disabledHint: '請先選 part id、time range、data type',
    summaryLabel: '分析條件',
  };
};

const cpTestConditions = (): QuestionForm => {
  return {
    formKey: 'cptest-conditions',
    title: '分析條件',
    fields: [
      { key: 'role', label: '你的角色', kind: 'single', required: true, options: CP_ROLES },
      {
        key: 'flow',
        label: 'Flow',
        kind: 'single',
        required: false,
        options: asOptions(CP_FLOWS),
        visibleWhen: { field: 'role', equals: 'baseline' },
      },
      {
        key: 'loop',
        label: 'Loop',
        kind: 'single',
        required: false,
        options: asOptions(CP_LOOPS),
        visibleWhen: { field: 'role', equals: 'loop' },
      },
      {
        key: 'other',
        label: '自行輸入範圍',
        kind: 'text',
        required: false,
        placeholder: '例如:M1+Via1、EOL 全段…',
        visibleWhen: { field: 'role', equals: 'other' },
      },
      { key: 'range', label: '時間區間', kind: 'single', required: true, options: CP_RANGES },
      {
        key: 'mineOnly',
        label: '檢視',
        kind: 'boolean',
        required: false,
        options: [{ value: 'mineOnly', label: '只看我送測的 (王小明)' }],
      },
    ],
    submitLabel: '開始分析',
    disabledHint: '請先選角色與時間區間',
    summaryLabel: '分析條件',
  };
};

/** The reask a Scenario opens with, or null when it runs straight away.
 *  Daily monitor needs nothing from the user — it is the whole-line morning report. */
export const openingQuestion = (
  scenarioKey: ScenarioKey,
  connectors: Connector[],
): QuestionForm | null => {
  if (scenarioKey === 'spc' || scenarioKey === 'inline') {
    return spcConditions(connectors);
  }
  if (scenarioKey === 'cptest') {
    return cpTestConditions();
  }
  return null;
};

/** The reask an SPC run raises mid-flight: the scan found more DC items than are worth
 *  charting in one go, so the user picks which to see first
 *  (eRDWorkspace20260819.html:10290-10312, :83224-83480). */
export const dcItemQuestion = (dcItems: DcItem[], rowsPerItem: number): QuestionForm => {
  const total = dcItems.length;
  const rows = (total * rowsPerItem).toLocaleString('en-US');

  return {
    formKey: 'dc-item-scope',
    title: 'DC item',
    intro:
      `約 ${total} 個 DC item(約 ${rows} 筆),資料量偏大。要先看哪些 DC Item?可勾選或自行輸入。` +
      `建議先選 3–5 項快速出圖確認;沒問題我再一次幫你補上其餘或全部 ${total} 項。`,
    fields: [
      {
        key: 'dcItems',
        label: 'DC item',
        kind: 'dcitem',
        required: true,
        allowCustom: true,
        placeholder: '搜尋 DC item…',
        customPlaceholder: '自訂 DC item…',
        options: dcItems.map((item) => ({
          value: item.id,
          label: item.name,
          unit: item.unit,
          lo: item.lo,
          hi: item.hi,
        })),
      },
    ],
    submitLabel: '先產生這 {count} 項',
    disabledHint: '至少選一項',
    summaryLabel: 'DC item',
  };
};

/** The wire truth for a QUESTION event: the backend sends only a flat Question[].
 *  The mock derives it from the rich form it also rides along as an extension, so
 *  the event stays verbatim-compatible with a real backend's. */
export const flattenQuestionForm = (form: QuestionForm): Question[] => {
  return form.fields.map((field) => ({
    text: field.label,
    options: (field.options ?? []).map((option) => option.label),
    multiSelect: field.kind === 'multi' || field.kind === 'dcitem',
  }));
};
