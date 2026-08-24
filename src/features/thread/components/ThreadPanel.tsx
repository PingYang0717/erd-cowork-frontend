import { DatabaseOutlined, ThunderboltFilled } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { ThemeToggle } from '@/features/theme/components/ThemeToggle';

import type { SendMessageInput } from '../api/messageApi';
import { useAgentStream } from '../hooks/useAgentStream';
import { messagesQueryKey, useMessages } from '../hooks/useMessages';
import { ChatComposer } from './ChatComposer';
import { MessageList } from './MessageList';
import styles from './ThreadPanel.module.css';

function ThreadHeader() {
  return (
    <header className={styles.header} aria-label="Thread header">
      <span className={styles.headerTitle}>
        <ThunderboltFilled aria-hidden className={styles.headerIcon} />
        Cowork · Data studio
      </span>
      {/* The mockup's data-source chip (its demo is wired to the Inline DB /
          N5 line fixture); sits beside the ThemeToggle per the scope-trim of
          the Workspace header (ADR-0003). */}
      <span className={styles.dataSourceChip}>
        <DatabaseOutlined aria-hidden />
        Inline DB · N5 line
      </span>
      <ThemeToggle />
    </header>
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
  const { state, send } = useAgentStream(sessionId);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The mockup scrolls the thread to the bottom shortly after a new message
  // renders (40ms, letting layout settle), so long conversations never leave
  // the latest reply out of view.
  useEffect(() => {
    const timer = setTimeout(() => {
      const body = bodyRef.current;
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [messages.length, state.steps.length, state.liveText]);

  async function handleSend(input: SendMessageInput) {
    await send(input);
    // The run itself is streamed, but both messages it produced live server-side —
    // refetch rather than reconstruct them from the events we happened to receive.
    await queryClient.invalidateQueries({ queryKey: messagesQueryKey(sessionId) });
  }

  const live = state.isStreaming ? { steps: state.steps, liveText: state.liveText } : null;
  const hasContent = messages.length > 0 || live !== null;

  return (
    <div className={styles.panel}>
      <ThreadHeader />
      <div ref={bodyRef} role="log" aria-label="Messages" className={styles.body}>
        {hasContent ? (
          <MessageList messages={messages} live={live} />
        ) : (
          <EmptyState
            heading="Start an analysis"
            subtitle={'Try "Daily monitor (A14)" below, or ask for an SPC analysis on Vt.'}
          />
        )}
      </div>
      <div className={styles.composer}>
        <ChatComposer onSend={handleSend} disabled={state.isStreaming} />
      </div>
    </div>
  );
}
