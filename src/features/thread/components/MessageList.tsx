import {
  AppstoreOutlined,
  CheckCircleFilled,
  LoadingOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';

import { AttachmentChip } from '@/features/file-upload/components/AttachmentChip';
import type { Message } from '@/types/api';

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
        eRD AI
      </div>
      <div role="status" aria-label="eRD AI is working" className={styles.workingSteps}>
        {steps.map((step, i) => (
          <div key={step.key} className={styles.workingStep}>
            <StepStatusIcon status={stepStatus(i, pendingAi.revealedSteps)} />
            <span>{step.title}</span>
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
