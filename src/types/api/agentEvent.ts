// Wire contract for the agent stream. Event names are SCREAMING_CASE and are
// deliberately NOT renamed to this project's TypeScript conventions — they are
// the line protocol shared with the backend, so live mode needs no translation
// layer (ADR-0005).

export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';

export interface StepItem {
  stepKey: string;
  title: string;
  description: string | null;
  status: StepStatus;
}

export type QuestionFieldKind = 'single' | 'multi' | 'text' | 'boolean' | 'daterange' | 'dcitem';

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
  unit?: string;
  lo?: number;
  hi?: number;
}

export interface QuestionField {
  key: string;
  label: string;
  kind: QuestionFieldKind;
  options?: QuestionOption[];
  required: boolean;
  placeholder?: string;
  hint?: string;
  allowCustom?: boolean;
  // Field dependency: CP Test's Flow only shows when role === 'baseline'.
  // Changing the upstream field clears every downstream field's answer.
  visibleWhen?: { field: string; equals: string };
}

export interface QuestionForm {
  formKey: string;
  title: string;
  intro?: string;
  fields: QuestionField[];
  submitLabel: string;
  disabledHint: string;
  summaryLabel: string;
}

export type QuestionAnswer = string | string[] | boolean;

/** One cell value in a TABLE event's rows — the honest union for what JSON gives us. */
export type TableCellValue = string | number | boolean | null;

/** One query-result table. Live-only: never persisted to the thread history. */
export interface TableResult {
  tableId: string;
  intent: string;
  columns: string[];
  rows: TableCellValue[][];
  truncated: boolean;
}

export type AgentEvent =
  | { type: 'STEP'; stepKey: string; title: string; description: string | null; status: StepStatus }
  | { type: 'TOKEN'; delta: string }
  | { type: 'ANSWER'; text: string }
  | { type: 'ARTIFACT'; artifactId: string; title: string }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'THINKING'; delta: string }
  | { type: 'QUESTION'; form: QuestionForm }
  | { type: 'CODE'; delta: string }
  | {
      type: 'TABLE';
      tableId: string;
      intent: string;
      columns: string[];
      rows: TableCellValue[][];
      truncated: boolean;
    };
