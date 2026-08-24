import { DatabaseOutlined, ThunderboltFilled } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { ThemeToggle } from '@/features/theme/components/ThemeToggle';

import type { SendMessageInput } from '../api/messageApi';
import { useAgentStream } from '../hooks/useAgentStream';
import { messagesQueryKey, useMessages } from '../hooks/useMessages';
import { useActiveRunStore } from '../store/useActiveRunStore';
import { ChatComposer } from './ChatComposer';
import { MessageList } from './MessageList';
import type { Answers } from './QuestionFormCard';
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
  const { state, send, stop } = useAgentStream(sessionId);
  const setStreamedArtifactId = useActiveRunStore((s) => s.setStreamedArtifactId);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Publishing to the Artifact pane is syncing with something outside this tree, and it
  // has to happen the moment the ARTIFACT event lands rather than when the run ends.
  useEffect(() => {
    setStreamedArtifactId(state.artifact?.artifactId ?? null);
  }, [state.artifact?.artifactId, setStreamedArtifactId]);

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

  // A run stays on screen after it ends when the ending is something the user needs to
  // see — they stopped it, it took a while, or it broke. A clean finish hands over to
  // the refetched history instead.
  // A reask keeps the run's surface on screen after the stream closes: the agent is
  // waiting on the user, so there is nothing to hand over to history yet.
  async function handleAnswer(answers: Answers) {
    await send({ answers, inReplyTo: state.question?.formKey ?? '' });
    await queryClient.invalidateQueries({ queryKey: messagesQueryKey(sessionId) });
  }

  const runEndedVisibly = state.stopped || state.error !== null || state.question !== null;
  const live =
    state.isStreaming || runEndedVisibly
      ? {
          isStreaming: state.isStreaming,
          steps: state.steps,
          liveText: state.liveText,
          stopped: state.stopped,
          thinking: state.thinking,
          question: state.question,
          error: state.error,
        }
      : null;
  const hasContent = messages.length > 0 || live !== null;

  return (
    <div className={styles.panel}>
      <ThreadHeader />
      <div ref={bodyRef} role="log" aria-label="Messages" className={styles.body}>
        {hasContent ? (
          <MessageList
            messages={messages}
            live={live}
            lastRunDurationMs={state.durationMs}
            onAnswer={handleAnswer}
          />
        ) : (
          <EmptyState
            heading="Start an analysis"
            subtitle={'Try "Daily monitor (A14)" below, or ask for an SPC analysis on Vt.'}
          />
        )}
      </div>
      <div className={styles.composer}>
        <ChatComposer
          onSend={handleSend}
          disabled={state.isStreaming}
          isStreaming={state.isStreaming}
          onStop={stop}
        />
      </div>
    </div>
  );
}
