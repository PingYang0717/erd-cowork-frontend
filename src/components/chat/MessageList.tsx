import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useRef } from 'react';

import { useActiveRunStore } from '@/stores/useActiveRunStore';
import type { Message, QuestionForm, StepItem, TableResult } from '@/types/api/index';
import { liftQuestions } from '@/utils/liftQuestions';

import { MessageBubble } from './MessageBubble';
import styles from './MessageList.module.css';
import type { Answers } from './QuestionFormCard';

/** What the current run has produced so far. Null once nothing is streaming. */
export interface LiveRun {
  /** Still open. Drives the live region — a run that has ended, however it ended, is
   *  no longer something a screen reader should announce as in progress. */
  isStreaming: boolean;
  steps: StepItem[];
  liveText: string;
  /** The user ended this run early. What it produced stays, but it is no longer working. */
  stopped: boolean;
  /** The connection died rather than closing; distinct from a user stop. */
  networkError: boolean;
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
  /** The artifact this run produced, before the refetched history carries it. */
  artifact: { artifactId: string; title: string } | null;
  /** Epoch ms the run started, which drives the ticking timer. */
  startedAt: number | null;
}

/** The wire carries steps as the backend's JSON string; a malformed one renders as no
 *  recap rather than a broken thread. */
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

/** The reask a past turn asked, lifted into the same form the live one renders. Answers
 *  were never persisted, so it comes back read-only. */
function parseQuestion(questionsJson: string | null): QuestionForm | null {
  if (!questionsJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(questionsJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    return liftQuestions(parsed);
  } catch {
    return null;
  }
}

interface MessageListProps {
  messages: Message[];
  live: LiveRun | null;
  /** The question just sent, shown as a user bubble before the refetched history
   *  carries it — a run takes seconds and the user's own words must not vanish. */
  optimisticUserText: string | null;
  /** Elapsed time of the run that just finished. Belongs to the turn that produced it,
   *  so it rides the tail AI bubble rather than the bottom of the thread. */
  lastRunDurationMs: number | null;
  onAnswer: (answers: Answers) => void;
  /** Rendered inside the scroll container, after the thread — anything that belongs to
   *  the tail of the conversation rather than above it. */
  bottomSlot?: ReactNode;
}

/** The thread, and the element that scrolls it. It owns the scroll because it owns what
 *  is appended: the log boundary a screen reader announces and the box that follows the
 *  newest turn have to be the same element. */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  live,
  optimisticUserText,
  lastRunDurationMs,
  onAnswer,
  bottomSlot,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Where the reader last was: following the newest turn only holds while they are at
  // the bottom. Scrolling up is how they read an earlier reply (or click its chip), and
  // yanking them back down on every re-render made that impossible. A ref, not state —
  // scroll position must never cause a render.
  const isNearBottomRef = useRef(true);
  // Published by the Artifact pane, so a chip's "shown right →" is decided by what is
  // actually on the right rather than by a guess the two could disagree on.
  const displayedArtifactId = useActiveRunStore((s) => s.displayedArtifactId);
  // Zustand's setter identity is stable, so passing it down does not defeat
  // MessageBubble's memoisation on every streamed token.
  const pickArtifact = useActiveRunStore((s) => s.pickArtifact);

  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      isNearBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container && isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, live, optimisticUserText, bottomSlot]);

  // The reader's own send is the exception: they just spoke, so the reply belongs on
  // screen no matter how far up they had scrolled.
  useEffect(() => {
    const container = containerRef.current;
    if (optimisticUserText !== null && container) {
      container.scrollTop = container.scrollHeight;
      isNearBottomRef.current = true;
    }
  }, [optimisticUserText]);

  // Parsed per settled message and memoised together: a streaming run re-renders this
  // list on every token, and re-parsing the whole history each time is O(history × tokens).
  const parsedHistory = useMemo(
    () =>
      messages.map((message) => ({
        steps: message.sender === 'AI' ? parseSteps(message.stepsJson) : [],
        question: message.sender === 'AI' ? parseQuestion(message.questionsJson) : null,
      })),
    [messages],
  );

  const lastIndex = messages.length - 1;

  return (
    <div
      ref={containerRef}
      role="log"
      aria-label="Messages"
      className={styles.thread}
      onScroll={handleScroll}
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          sender={message.sender}
          text={message.text}
          attachments={message.attachments}
          steps={parsedHistory[index].steps}
          artifact={
            message.artifactId
              ? { artifactId: message.artifactId, title: message.artifactTitle ?? message.text }
              : null
          }
          question={parsedHistory[index].question}
          artifactShown={message.artifactId !== null && message.artifactId === displayedArtifactId}
          onPickArtifact={pickArtifact}
          questionDisabled
          // The turn that just finished is the tail of the history once the live bubble
          // has handed over; nothing older has a duration to show.
          durationMs={
            live === null && index === lastIndex && message.sender === 'AI'
              ? lastRunDurationMs
              : null
          }
        />
      ))}
      {optimisticUserText !== null && <MessageBubble sender="USER" text={optimisticUserText} />}
      {live && (
        <MessageBubble
          sender="AI"
          text={live.liveText}
          steps={live.steps}
          artifact={live.artifact}
          artifactShown={live.artifact !== null && live.artifact.artifactId === displayedArtifactId}
          onPickArtifact={pickArtifact}
          streaming={live.isStreaming}
          stopped={live.stopped}
          networkError={live.networkError}
          thinking={live.thinking || null}
          // A reask appears the moment it is asked: the run is blocked on the answer,
          // so waiting for the stream to close would just be dead time on screen.
          question={live.question}
          onAnswer={onAnswer}
          codeText={live.codeText || null}
          tables={live.tables}
          error={live.error}
          durationMs={live.isStreaming ? null : lastRunDurationMs}
          timerStartedAt={live.isStreaming ? live.startedAt : null}
        />
      )}
      {bottomSlot}
    </div>
  );
};

export { MessageList };
export default MessageList;
