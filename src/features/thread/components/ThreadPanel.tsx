import { ThunderboltFilled } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { ThemeToggle } from '@/features/theme/components/ThemeToggle';
import type { Message } from '@/types/api';

import type { SendMessageInput } from '../api/messageApi';
import { messagesQueryKey, useMessages } from '../hooks/useMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { ChatComposer } from './ChatComposer';
import { MessageList, type PendingAiMessage } from './MessageList';
import styles from './ThreadPanel.module.css';

const STEP_DURATION_MS = 500;

function ThreadHeader() {
  return (
    <div className={styles.header}>
      <span className={styles.headerTitle}>
        <ThunderboltFilled aria-hidden className={styles.headerIcon} />
        Cowork · Data studio
      </span>
      <ThemeToggle />
    </div>
  );
}

function EmptyState({ heading, subtitle }: { heading: string; subtitle: ReactNode }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>
        <ThunderboltFilled aria-hidden />
      </div>
      <p className={styles.emptyStateHeading}>{heading}</p>
      <p className={styles.emptyStateSubtitle}>{subtitle}</p>
    </div>
  );
}

export function ThreadPanel() {
  const selectedSessionId = useSessionSelectionStore((s) => s.selectedSessionId);

  if (!selectedSessionId) {
    return (
      <div className={styles.panel}>
        <ThreadHeader />
        <div className={styles.body}>
          <EmptyState
            heading="Select or start a session"
            subtitle="Start or select a session from the left to begin an analysis."
          />
        </div>
      </div>
    );
  }

  return <ThreadView sessionId={selectedSessionId} />;
}

function ThreadView({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { data } = useMessages(sessionId);
  const messages = data ?? [];
  const sendMessage = useSendMessage(sessionId);
  const [pendingAi, setPendingAi] = useState<PendingAiMessage | null>(null);

  useEffect(() => {
    if (!pendingAi) {
      return;
    }
    const steps = pendingAi.message.steps ?? [];
    const timers = steps.map((_, i) =>
      setTimeout(
        () => {
          setPendingAi((prev) => (prev ? { ...prev, revealedSteps: i + 1 } : prev));
        },
        STEP_DURATION_MS * (i + 1),
      ),
    );
    timers.push(
      setTimeout(
        () => {
          queryClient.setQueryData<Message[]>(messagesQueryKey(sessionId), (prev = []) => [
            ...prev,
            pendingAi.message,
          ]);
          setPendingAi(null);
        },
        STEP_DURATION_MS * (steps.length + 1),
      ),
    );
    return () => timers.forEach(clearTimeout);
    // Only the arrival of a new pending AI message should restart the playback timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAi?.message.id]);

  async function handleSend(input: SendMessageInput) {
    const result = await sendMessage.mutateAsync(input);
    queryClient.setQueryData<Message[]>(messagesQueryKey(sessionId), (prev = []) => [
      ...prev,
      result.userMessage,
    ]);
    setPendingAi({ message: result.aiMessage, revealedSteps: 0 });
  }

  const hasContent = messages.length > 0 || pendingAi !== null;

  return (
    <div className={styles.panel}>
      <ThreadHeader />
      <div className={styles.body}>
        {hasContent ? (
          <MessageList messages={messages} pendingAi={pendingAi} />
        ) : (
          <EmptyState
            heading="Start an analysis"
            subtitle={'Try "Daily monitor (A14)" below, or ask for an SPC analysis on Vt.'}
          />
        )}
      </div>
      <div className={styles.composer}>
        <ChatComposer onSend={handleSend} disabled={sendMessage.isPending || pendingAi !== null} />
      </div>
    </div>
  );
}
