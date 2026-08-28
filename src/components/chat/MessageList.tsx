import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useRef } from 'react';

import { useActiveRunStore } from '@/stores/useActiveRunStore';
import type { Message, QuestionForm, StepItem } from '@/types/api/index';
import { liftQuestions } from '@/utils/liftQuestions';

import MessageBubble, { type LiveRun } from './MessageBubble';

export type { LiveRun } from './MessageBubble';
import styles from './MessageList.module.css';
import type { Answers } from './QuestionFormCard';

/** What the current run has produced so far. Null once nothing is streaming. */
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

  // Deps are the pieces of content that can change the log's height — not the `live`
  // object itself, whose identity is fresh on every parent render and would force a
  // scrollHeight read (a synchronous reflow) on renders where nothing grew.
  useEffect(() => {
    const container = containerRef.current;
    if (container && isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [
    messages,
    live?.liveText,
    live?.thinking,
    live?.codeText,
    live?.steps,
    live?.tables,
    live?.question,
    optimisticUserText,
    bottomSlot,
  ]);

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
  // The artifact object lives here for the same reason — built inline in the JSX it
  // would be a fresh object every token, and a fresh object prop is all it takes to
  // defeat MessageBubble's memo (probe-measured: bubbles with an artifact re-rendered
  // once per token; text-only bubbles not at all).
  const parsedHistory = useMemo(
    () =>
      messages.map((message) => ({
        steps: message.sender === 'AI' ? parseSteps(message.stepsJson) : [],
        question: message.sender === 'AI' ? parseQuestion(message.questionsJson) : null,
        artifact: message.artifactId
          ? { artifactId: message.artifactId, title: message.artifactTitle ?? message.text }
          : null,
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
          artifact={parsedHistory[index].artifact}
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
          live={live}
          artifactShown={live.artifact !== null && live.artifact.artifactId === displayedArtifactId}
          onPickArtifact={pickArtifact}
          // A reask appears the moment it is asked (the run is blocked on the answer),
          // which is why the handler is wired here and not only after the stream closes.
          onAnswer={onAnswer}
          durationMs={live.isStreaming ? null : lastRunDurationMs}
        />
      )}
      {bottomSlot}
    </div>
  );
};

export default MessageList;
