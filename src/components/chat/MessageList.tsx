import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  LoadingOutlined,
  ThunderboltFilled,
  UpOutlined,
} from '@ant-design/icons';
import React, { useState } from 'react';

import { AttachmentChip } from '@/components/files/AttachmentChip';
import type { Message, QuestionForm, StepItem, StepStatus, TableResult } from '@/types/api/index';
import { formatDuration } from '@/utils/formatDuration';

import { HtmlCodePanel } from './HtmlCodePanel';
import styles from './MessageList.module.css';
import { type Answers, QuestionFormCard } from './QuestionFormCard';
import { ReplyText } from './ReplyText';
import { ResultTable } from './ResultTable';
import { ThinkingPanel } from './ThinkingPanel';

/** What the current run has produced so far. Null once nothing is streaming. */
export interface LiveRun {
  /** Still open. Drives the live region — a run that has ended, however it ended, is
   *  no longer something a screen reader should announce as in progress. */
  isStreaming: boolean;
  steps: StepItem[];
  liveText: string;
  /** The user ended this run early. What it produced stays, but it is no longer working. */
  stopped: boolean;
  /** Reasoning streamed so far. Live-only. */
  thinking: string;
  /** The reask the run is waiting on, if any. */
  question: QuestionForm | null;
  /** Artifact HTML as it is written, and the query results produced on the way.
   *  Both live-only. */
  codeText: string;
  tables: TableResult[];
  /** Set when the run ended badly; shown as an alert under whatever it produced. */
  error: { code: string; message: string } | null;
}

// Steps used to be revealed by a client-side timer, so a step could only ever be
// pending, running or done. The backend now reports the status itself, which means a
// step can also fail — hence the fourth state (ADR-0005).
const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Done',
  ERROR: 'Failed',
};

function StepStatusIcon({ status }: { status: StepStatus }) {
  const label = STEP_STATUS_LABEL[status];

  if (status === 'SUCCESS') {
    return <CheckCircleFilled aria-label={label} className={styles.stepIconSuccess} />;
  }
  if (status === 'RUNNING') {
    return <LoadingOutlined aria-label={label} spin className={styles.stepIconRunning} />;
  }
  if (status === 'ERROR') {
    return <CloseCircleFilled aria-label={label} className={styles.stepIconError} />;
  }
  return <span aria-label={label} role="img" className={styles.stepIconPending} />;
}

function StepRow({ step }: { step: StepItem }) {
  return (
    <div className={styles.workingStep}>
      <StepStatusIcon status={step.status} />
      <span className={styles.stepText}>
        <span className={styles.stepTitle}>{step.title}</span>
        {step.description !== null && (
          <span className={styles.stepDescription}>{step.description}</span>
        )}
      </span>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

// Memoised: a streaming run re-renders the whole list on every token, while a
// settled message above it never changes.
const MessageBubble = React.memo<MessageBubbleProps>(({ message }) => {
  if (message.sender === 'USER') {
    const attachments = message.attachments ?? [];

    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>
          {attachments.length > 0 && (
            <ul className={styles.userAttachments} aria-label="Message attachments">
              {attachments.map((upload) => (
                <li key={upload.id}>
                  <AttachmentChip upload={upload} />
                </li>
              ))}
            </ul>
          )}
          <span className={styles.userText}>{message.text}</span>
        </div>
      </div>
    );
  }

  const steps = parseSteps(message.stepsJson);

  return (
    <div className={styles.aiRow}>
      <div className={styles.aiLabel}>
        <ThunderboltFilled aria-hidden className={styles.aiLabelIcon} />
        eRD AI
      </div>
      {steps.length > 0 && <StepsRecap steps={steps} />}
      <ReplyText text={message.text} />
      {message.artifactTitle && (
        <div className={styles.artifactChip}>
          <AppstoreOutlined aria-hidden className={styles.artifactChipIcon} />
          <span>{message.artifactTitle}</span>
          <span className={styles.artifactChipHint}>shown right →</span>
        </div>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

/** The wire carries steps as the backend's JSON string; a malformed one renders as no
 *  recap rather than a broken thread. Parsed per bubble render — MessageBubble is
 *  memoised, so a settled message parses once. */
function parseSteps(stepsJson: string | null): StepItem[] {
  if (!stepsJson) {
    return [];
  }
  try {
    const parsed = JSON.parse(stepsJson) as unknown;
    return Array.isArray(parsed) ? (parsed as StepItem[]) : [];
  } catch {
    return [];
  }
}

// After a run completes, its steps stay behind as the mockup's collapsed
// "Worked through N steps" card, expandable to each step's title and
// description.
function StepsRecap({ steps }: { steps: StepItem[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // The mockup leads the row with the run's outcome. A recap is only ever
  // rendered for a finished run, so the only question left is whether any step
  // failed.
  const hasFailure = steps.some((step) => step.status === 'ERROR');

  return (
    <div className={styles.stepsRecap}>
      <button
        type="button"
        className={styles.stepsRecapToggle}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {/* Decorative, like every other icon on this surface: the toggle's
            accessible name has to stay exactly its label, and each step's own
            status is announced by `StepStatusIcon` once expanded. */}
        {hasFailure ? (
          <CloseCircleFilled
            aria-hidden
            className={`${styles.stepsRecapStatus} ${styles.stepIconError}`}
          />
        ) : (
          <CheckCircleFilled
            aria-hidden
            className={`${styles.stepsRecapStatus} ${styles.stepIconSuccess}`}
          />
        )}
        Worked through {steps.length} steps
        {isExpanded ? (
          <UpOutlined aria-hidden className={styles.stepsRecapChevron} />
        ) : (
          <DownOutlined aria-hidden className={styles.stepsRecapChevron} />
        )}
      </button>
      {isExpanded && (
        <div className={styles.stepsRecapList}>
          {steps.map((step) => (
            <StepRow key={step.stepKey} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

function liveRunLabel(live: LiveRun): string {
  if (live.isStreaming) {
    return 'eRD AI is working…';
  }
  return live.stopped ? 'eRD AI · stopped' : 'eRD AI';
}

function LiveRunView({ live, onAnswer }: { live: LiveRun; onAnswer: (answers: Answers) => void }) {
  const steps = live.steps.map((step) => <StepRow key={step.stepKey} step={step} />);

  return (
    <div className={styles.aiRow}>
      <div className={styles.aiLabel}>
        <ThunderboltFilled aria-hidden className={styles.aiLabelIcon} />
        {liveRunLabel(live)}
      </div>
      {live.isStreaming ? (
        <div role="status" aria-label="eRD AI is working" className={styles.workingSteps}>
          {steps}
        </div>
      ) : (
        <div className={styles.workingSteps}>{steps}</div>
      )}
      {live.thinking && <ThinkingPanel thinking={live.thinking} />}
      {live.codeText && <HtmlCodePanel code={live.codeText} />}
      {live.tables.map((table) => (
        <ResultTable key={table.tableId} table={table} />
      ))}
      {live.liveText && <ReplyText text={live.liveText} />}
      {live.question && <QuestionFormCard form={live.question} onSubmit={onAnswer} />}
      {live.error && (
        <p role="alert" className={styles.runError}>
          {live.error.message}
        </p>
      )}
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  live: LiveRun | null;
  /** Elapsed time of the run that just finished; a footer under the thread rather than
   *  part of any message, since it is not persisted with the conversation. */
  lastRunDurationMs: number | null;
  onAnswer: (answers: Answers) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  live,
  lastRunDurationMs,
  onAnswer,
}) => {
  return (
    <div>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {live && <LiveRunView live={live} onAnswer={onAnswer} />}
      {lastRunDurationMs !== null && (
        <p className={styles.runDuration}>Took {formatDuration(lastRunDurationMs)}</p>
      )}
    </div>
  );
};

export { MessageList };
export default MessageList;
