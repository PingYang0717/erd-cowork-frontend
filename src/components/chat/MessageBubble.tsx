import {
  AppstoreOutlined,
  LoadingOutlined,
  ThunderboltFilled,
  ToolOutlined,
} from '@ant-design/icons';
import React, { useDeferredValue, useMemo } from 'react';

import { INTERRUPTED_TEXTS, REPAIR_RECORD_PREFIXES } from '@/constants/wireStrings';
import type { AgentStreamState } from '@/hooks/useAgentStream';
import type { QuestionForm, StepItem } from '@/types/api';
import { splitAnswerByTableMarkers } from '@/utils/tableMarkers';

import CollapsiblePanel from './CollapsiblePanel';
import { Elapsed, LiveElapsed } from './Elapsed';
import HtmlCodePanel from './HtmlCodePanel';
import styles from './MessageBubble.module.css';
import QuestionFormCard, { type Answers } from './QuestionFormCard';
import { StepRow, StepsRecap } from './StepList';

/** The slice of a run's state this bubble renders. A `Pick` rather than its own shape:
 *  the reducer's state is the single source of truth for what a run carries, so a new
 *  live field is added exactly once (per-field docs live on `AgentStreamState`). */
export type LiveRun = Pick<
  AgentStreamState,
  | 'isStreaming'
  | 'stopped'
  | 'networkError'
  | 'steps'
  | 'liveText'
  | 'thinking'
  | 'codeText'
  | 'tables'
  | 'question'
  | 'error'
  | 'artifact'
  | 'startedAt'
>;
import { useTranslations } from '@/i18n/useTranslations';
import type { Translations } from '@/i18n/zhTW';

import ReplyText from './ReplyText';
import ResultTable from './ResultTable';

export interface MessageBubbleProps {
  sender: 'USER' | 'AI';
  /** A settled message's text. The live bubble's text comes from `live.liveText`. */
  text?: string;
  /** Attachments sent with this message. Ours hang off the message, not the session. */
  steps?: StepItem[] | null;
  artifact?: { artifactId: string; title: string } | null;
  question?: QuestionForm | null;
  /** History reasks render read-only: the answers were never persisted, so there is
   *  nothing to re-submit. */
  questionDisabled?: boolean;
  onAnswer?: (answers: Answers) => void;
  /** True when this reply's artifact is the one the Artifact pane is showing; the
   *  chip then states the fact instead of offering the hand-off. */
  artifactShown?: boolean;
  /** Puts this reply's artifact on the Artifact pane. Without it the chip is a plain
   *  label (full-page artifact view has no pane to hand to). */
  onPickArtifact?: (artifactId: string) => void;
  /** How long the turn behind this bubble took; shown once it is over. */
  durationMs?: number | null;
  /** The open (or visibly-ended) run this bubble fronts. One object instead of the
   *  nine per-field props it used to be: the fields only ever travel together — the
   *  reducer's own state IS this shape (`LiveRun` is a `Pick` of it) — and hand-copying
   *  them across ThreadPanel → MessageList → here meant a new live field touched four
   *  files. History bubbles simply omit it, so their memoised props stay flat and
   *  stable. When set, `liveText` / `steps` / `artifact` / `question` / `tables` win
   *  over the flat props. */
  live?: LiveRun | null;
}

// Steps used to be revealed by a client-side timer, so a step could only ever be
// pending, running or done. The backend now reports the status itself, which means a
// step can also fail — hence the fourth state (ADR-0003).
/** Messages the backend persists on its own behalf — an interrupted response, a repair
 *  outcome. They are records, not agent prose, so they never reach the Markdown renderer. */
const systemRecordKind = (text: string): 'interrupted' | 'repair' | null => {
  if (INTERRUPTED_TEXTS.includes(text)) {
    return 'interrupted';
  }
  return REPAIR_RECORD_PREFIXES.some((prefix) => text.startsWith(prefix)) ? 'repair' : null;
};

/** One turn in the thread. History and the run in flight go through exactly this
 *  component: a turn that has just finished must look identical to the same turn read
 *  back tomorrow, or the hand-off from live to history flickers. */
const MessageBubble: React.FC<MessageBubbleProps> = ({
  sender,
  text: settledText,
  steps: settledSteps,
  artifact: settledArtifact,
  question: settledQuestion,
  questionDisabled = false,
  onAnswer,
  artifactShown = false,
  onPickArtifact,
  durationMs,
  live,
}) => {
  const t = useTranslations();
  // One source per field: a live run's own state, else the settled message's.
  const text = live ? live.liveText : (settledText ?? '');
  const steps = live ? live.steps : settledSteps;
  const artifact = live ? live.artifact : settledArtifact;
  const question = live ? live.question : settledQuestion;
  const streaming = live?.isStreaming ?? false;
  const stopped = live?.stopped ?? false;
  const networkError = live?.networkError ?? false;
  const thinking = live?.thinking || null;
  const codeText = live?.codeText || null;
  const tables = live?.tables;
  const error = live?.error ?? null;
  const timerStartedAt = live?.isStreaming ? live.startedAt : null;

  // Streaming appends 10-40 tokens a second, and each one re-renders this bubble with a
  // longer `text`. The expensive part is below: splitting and markdown-parsing the FULL
  // accumulated text — n tokens cost O(n²) total. So the parse follows a *deferred* copy:
  // React keeps the cheap parts (label, timer, steps) on every token and re-parses only
  // when the main thread has room, skipping intermediate values under load. Zero timers,
  // so the test doctrine (src/test/README.md: the test decides when events arrive, every
  // state observable) is untouched — act() flushes deferred renders synchronously.
  const deferredText = useDeferredValue(text);
  const recordKind = systemRecordKind(text);
  // Markers say where a table belongs in the answer. A table nobody placed still has to
  // appear somewhere, so it goes after the text rather than vanishing.
  const segments = useMemo(
    () => (recordKind ? [] : splitAnswerByTableMarkers(deferredText, tables)),
    [recordKind, deferredText, tables],
  );

  if (sender === 'USER') {
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>
          <span className={styles.userText}>{text}</span>
        </div>
      </div>
    );
  }

  const hasSteps = steps != null && steps.length > 0;
  // A turn is still in play while the stream is open, while it waits on an unanswered
  // reask, and after a stop — its steps stay unfolded, because "Worked through N steps"
  // is a claim about a turn that finished. A disabled reask is a past one, so a history
  // bubble carrying it is settled.
  const turnInPlay = streaming || stopped || (question != null && !questionDisabled);
  const placedTableIds = new Set(
    segments.flatMap((segment) => (segment.type === 'table' ? [segment.table.tableId] : [])),
  );
  const unplacedTables = (tables ?? []).filter((table) => !placedTableIds.has(table.tableId));

  return (
    <div className={styles.aiRow}>
      <div className={styles.aiLabel}>
        <ThunderboltFilled aria-hidden className={styles.aiLabelIcon} />
        {agentLabel(stopped, t.chat)}
      </div>
      <div className={styles.aiBubble}>
        {/* The live region exists for as long as the run does, not only once it has
            something to say: a run that has started but reported nothing yet is still
            what a screen reader needs announced. */}
        {streaming && (
          <div role="status" aria-label="eRD AI is working" className={styles.workingSteps}>
            {/* The run says it is running from inside the step panel, where the steps it
                is producing appear — rather than from the label above, which names who is
                speaking and should read the same whether or not they are mid-sentence. */}
            <div className={styles.workingHeader}>
              <LoadingOutlined aria-hidden spin className={styles.workingHeaderIcon} />
              {t.chat.agentThinking}
            </div>
            {(steps ?? []).map((step) => (
              <StepRow key={step.stepKey} step={step} />
            ))}
          </div>
        )}
        {!streaming && turnInPlay && hasSteps && (
          <div className={styles.workingSteps}>
            {steps.map((step) => (
              <StepRow key={step.stepKey} step={step} />
            ))}
          </div>
        )}
        {!turnInPlay && hasSteps && <StepsRecap steps={steps} />}

        {/* The agent's reasoning as it arrives. Collapsed by default and never
            persisted: it belongs to this connection, not to the conversation
            (ADR-0003). */}
        {thinking && (
          <CollapsiblePanel label={t.chat.thinking}>
            <p className={styles.thinkingBody}>{thinking}</p>
          </CollapsiblePanel>
        )}
        {codeText && <HtmlCodePanel code={codeText} autoScroll={streaming} />}

        {recordKind === 'interrupted' && (
          <p data-record="true" className={styles.record}>
            {text}
          </p>
        )}
        {recordKind === 'repair' && (
          <p data-record="true" className={styles.record}>
            <ToolOutlined aria-hidden className={styles.recordIcon} />
            {text}
          </p>
        )}

        {segments.map((segment, index) =>
          segment.type === 'table' ? (
            <ResultTable key={`table-${segment.table.tableId}-${index}`} table={segment.table} />
          ) : (
            <ReplyText key={`text-${index}`} text={segment.content} />
          ),
        )}
        {unplacedTables.map((table) => (
          <ResultTable key={table.tableId} table={table} />
        ))}

        {artifact &&
          (onPickArtifact ? (
            /* Clickable, like cowork's: the pane can only be steered from its own
               version menu otherwise, so an earlier reply's chip would claim "shown
               right" about something that is not on the right at all (ADR-0002). */
            <button
              type="button"
              className={`${styles.artifactChip} ${styles.artifactChipButton} ${
                artifactShown ? styles.artifactChipShown : ''
              }`}
              aria-label={
                artifactShown
                  ? `${artifact.title} — shown in the Artifact panel`
                  : `Show ${artifact.title} in the Artifact panel`
              }
              aria-current={artifactShown ? 'true' : undefined}
              onClick={() => onPickArtifact(artifact.artifactId)}
            >
              <AppstoreOutlined aria-hidden className={styles.artifactChipIcon} />
              <span className={styles.artifactChipTitle}>{artifact.title}</span>
              <span className={styles.artifactChipHint}>
                {artifactShown ? t.chat.shownRight : t.chat.showRight}
              </span>
            </button>
          ) : (
            <div className={styles.artifactChip}>
              <AppstoreOutlined aria-hidden className={styles.artifactChipIcon} />
              <span className={styles.artifactChipTitle}>{artifact.title}</span>
              <span className={styles.artifactChipHint}>{t.chat.shownRight}</span>
            </div>
          ))}
        {/* The source is only fetchable once the run has stopped writing it; while it is
            still arriving, the live panel above is the same content. */}
        {artifact && !codeText && <HtmlCodePanel artifactId={artifact.artifactId} />}

        {question && (
          <QuestionFormCard
            form={question}
            disabled={questionDisabled}
            onSubmit={onAnswer ?? (() => {})}
          />
        )}

        {/* Keyed on the start: a new turn gets a fresh timer rather than inheriting the
            last one's reading for up to a second. */}
        {streaming && timerStartedAt != null && (
          <LiveElapsed key={timerStartedAt} startedAt={timerStartedAt} />
        )}
        {!streaming && durationMs != null && <Elapsed ms={durationMs} />}

        {stopped && <p className={styles.stateNote}>{t.chat.stopped}</p>}
        {/* Still an alert: the run ended in a way the user has to act on, and the
            dedicated wording is what distinguishes it from a backend refusal. */}
        {networkError && (
          <p role="alert" className={styles.networkNote}>
            {t.chat.networkError}
          </p>
        )}
        {error && !networkError && (
          <p role="alert" className={styles.runError}>
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
};

/** Who is speaking. It stays the same whether or not they are mid-sentence: that the run
 *  is in progress is said inside the bubble, next to the steps it is producing.
 *
 *  A stop is likewise reported inside (⏹ 已停止生成, cowork's wording) — the label carries
 *  it too because a stopped turn has no live panel left to say it from. */
/** Takes the copy rather than reaching for it. Reading the language here worked only
 *  because the one caller subscribes to it — move this into a memoised child and the
 *  label would freeze on whatever language was current when it mounted, silently. */
const agentLabel = (stopped: boolean, t: Translations['chat']): string => {
  return stopped ? t.agentStopped : t.agentName;
};

/** The open turn's timer. The clock is read in the interval rather than during render —
 *  a render has to be able to run twice and say the same thing. */
// Memoised: a streaming run re-renders the whole list on every token, while a settled
// message above it never changes.
const MemoisedMessageBubble = React.memo(MessageBubble);

export default MemoisedMessageBubble;
