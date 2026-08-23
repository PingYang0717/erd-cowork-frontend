import {
  AppstoreOutlined,
  CheckCircleFilled,
  DownOutlined,
  LoadingOutlined,
  RightOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { useState } from 'react';

import { AttachmentChip } from '@/features/file-upload/components/AttachmentChip';
import type { Message, MessageStep } from '@/types/api';

import styles from './MessageList.module.css';

export interface PendingAiMessage {
  message: Message;
  revealedSteps: number;
}

function StepStatusIcon({ status }: { status: 'success' | 'running' | 'pending' }) {
  if (status === 'success') {
    return <CheckCircleFilled aria-hidden className={styles.stepIconSuccess} />;
  }
  if (status === 'running') {
    return <LoadingOutlined aria-hidden spin className={styles.stepIconRunning} />;
  }
  return <span aria-hidden className={styles.stepIconPending} />;
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    const attachments = message.attachments ?? [];

    return (
      <div className={styles.userRow}>
        <div className={styles.userMessage}>
          <div className={styles.userBubble}>{message.text}</div>
          {attachments.length > 0 && (
            <ul className={styles.userAttachments} aria-label="Message attachments">
              {attachments.map((upload) => (
                <li key={upload.id}>
                  <AttachmentChip upload={upload} />
                </li>
              ))}
            </ul>
          )}
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
          Artifact: {message.artifactName}
        </div>
      )}
    </div>
  );
}

// After a run completes, its steps stay behind as the mockup's collapsed
// "Worked through N steps" card, expandable to each step's title and
// description.
function StepsRecap({ steps }: { steps: MessageStep[] }) {
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
            <div key={step.key} className={styles.workingStep}>
              <CheckCircleFilled aria-hidden className={styles.stepIconSuccess} />
              <span className={styles.stepText}>
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepDescription}>{step.description}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function stepStatus(index: number, revealedSteps: number) {
  if (index < revealedSteps) {
    return 'success';
  }
  if (index === revealedSteps) {
    return 'running';
  }
  return 'pending';
}

function AiWorkingSteps({ pendingAi }: { pendingAi: PendingAiMessage }) {
  const steps = pendingAi.message.steps ?? [];

  return (
    <div className={styles.aiRow}>
      <div className={styles.aiLabel}>
        <ThunderboltFilled aria-hidden className={styles.aiLabelIcon} />
        eRD AI is working…
      </div>
      <div role="status" aria-label="eRD AI is working" className={styles.workingSteps}>
        {steps.map((step, i) => (
          <div key={step.key} className={styles.workingStep}>
            <StepStatusIcon status={stepStatus(i, pendingAi.revealedSteps)} />
            <span className={styles.stepText}>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepDescription}>{step.description}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  pendingAi: PendingAiMessage | null;
}

export function MessageList({ messages, pendingAi }: MessageListProps) {
  return (
    <div>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {pendingAi && <AiWorkingSteps pendingAi={pendingAi} />}
    </div>
  );
}
