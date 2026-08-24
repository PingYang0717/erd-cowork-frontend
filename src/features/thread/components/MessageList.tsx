import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  LoadingOutlined,
  RightOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { useState } from 'react';

import { AttachmentChip } from '@/features/file-upload/components/AttachmentChip';
import type { Message, StepItem, StepStatus } from '@/types/api';

import styles from './MessageList.module.css';

/** What the current run has produced so far. Null once nothing is streaming. */
export interface LiveRun {
  steps: StepItem[];
  liveText: string;
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

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
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

  return (
    <div className={styles.aiRow}>
      <div className={styles.aiLabel}>
        <ThunderboltFilled aria-hidden className={styles.aiLabelIcon} />
        eRD AI
      </div>
      {message.steps && message.steps.length > 0 && <StepsRecap steps={message.steps} />}
      <p className={styles.aiText}>{message.text}</p>
      {message.artifactName && (
        <div className={styles.artifactChip}>
          <AppstoreOutlined aria-hidden className={styles.artifactChipIcon} />
          <span>{message.artifactName}</span>
          <span className={styles.artifactChipHint}>shown right →</span>
        </div>
      )}
    </div>
  );
}

// After a run completes, its steps stay behind as the mockup's collapsed
// "Worked through N steps" card, expandable to each step's title and
// description.
function StepsRecap({ steps }: { steps: StepItem[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.stepsRecap}>
      <button
        type="button"
        className={styles.stepsRecapToggle}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded ? (
          <DownOutlined aria-hidden className={styles.stepsRecapChevron} />
        ) : (
          <RightOutlined aria-hidden className={styles.stepsRecapChevron} />
        )}
        Worked through {steps.length} steps
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

function AiWorkingSteps({ live }: { live: LiveRun }) {
  return (
    <div className={styles.aiRow}>
      <div className={styles.aiLabel}>
        <ThunderboltFilled aria-hidden className={styles.aiLabelIcon} />
        eRD AI is working…
      </div>
      <div role="status" aria-label="eRD AI is working" className={styles.workingSteps}>
        {live.steps.map((step) => (
          <StepRow key={step.stepKey} step={step} />
        ))}
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  live: LiveRun | null;
}

export function MessageList({ messages, live }: MessageListProps) {
  return (
    <div>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {live && <AiWorkingSteps live={live} />}
    </div>
  );
}
