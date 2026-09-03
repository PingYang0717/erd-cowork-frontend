import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { AgentStreamHttpError, type SendMessageArgs, streamAgentMessage } from '@/api/agentApi';
import { isCanceled } from '@/api/apiError';
import { getTranslations } from '@/i18n/useTranslations';
import type { AgentEvent, QuestionForm, StepItem, TableResult } from '@/types/api/agentEvent';
import { liftQuestions } from '@/utils/liftQuestions';

import { sessionsQueryKey } from './useSessions';

/** Everything about a run except which session it belongs to and how it is cancelled. */
export type SendInput = Omit<SendMessageArgs, 'sessionId' | 'signal'>;

export interface AgentStreamState {
  isStreaming: boolean;
  /** True from the moment the user hits stop; cleared when the next run starts. */
  stopped: boolean;
  steps: StepItem[];
  liveText: string;
  answer: string | null;
  artifact: { artifactId: string; title: string } | null;
  question: QuestionForm | null;
  error: { code: string; message: string } | null;
  /** True only for an unexpected disconnection — never for a user-initiated stop
   *  or a refusal the backend reported with a code. */
  networkError: boolean;
  // Live-only: thinking, code and tables belong to this connection, not to the
  // thread history (ADR-0003).
  thinking: string;
  codeText: string;
  tables: TableResult[];
  /** Wall-clock milliseconds the finished run took; null while idle or streaming. */
  durationMs: number | null;
  /** Epoch ms the current run started; null while idle. Drives the bubble's live timer,
   *  which has to tick from the start rather than only report at the end. */
  startedAt: number | null;
}

type Action =
  | { type: 'START'; startedAt: number }
  | { type: 'RESET' }
  | { type: 'EVENT'; event: AgentEvent }
  | { type: 'STOPPED' }
  | { type: 'FAILED'; error: { code: string; message: string } }
  | { type: 'DISCONNECTED'; durationMs: number }
  | { type: 'DONE'; durationMs: number };

const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
// English to match every other string on this surface; the mockup's Chinese copy is
// confined to the clarification forms.
const initialState: AgentStreamState = {
  isStreaming: false,
  stopped: false,
  steps: [],
  liveText: '',
  answer: null,
  artifact: null,
  question: null,
  error: null,
  networkError: false,
  thinking: '',
  codeText: '',
  tables: [],
  durationMs: null,
  startedAt: null,
};

/** A step is identified by its `stepKey`: a later event for the same key is a status
 *  transition, not a new step, and must not move it in the list. */
const upsertStep = (steps: StepItem[], incoming: StepItem): StepItem[] => {
  const existingIndex = steps.findIndex((step) => step.stepKey === incoming.stepKey);

  if (existingIndex === -1) {
    return [...steps, incoming];
  }

  return steps.map((step, index) => (index === existingIndex ? incoming : step));
};

const reducer = (state: AgentStreamState, action: Action): AgentStreamState => {
  switch (action.type) {
    case 'START':
      return { ...initialState, isStreaming: true, startedAt: action.startedAt };

    case 'RESET':
      return initialState;

    case 'EVENT': {
      const agentEvent = action.event;

      switch (agentEvent.type) {
        case 'STEP':
          return {
            ...state,
            steps: upsertStep(state.steps, {
              stepKey: agentEvent.stepKey,
              title: agentEvent.title,
              description: agentEvent.description,
              status: agentEvent.status,
            }),
          };

        case 'TOKEN':
          return { ...state, liveText: state.liveText + agentEvent.delta };

        case 'ANSWER':
          return { ...state, answer: agentEvent.text };

        case 'ARTIFACT':
          return {
            ...state,
            artifact: { artifactId: agentEvent.artifactId, title: agentEvent.title },
          };

        case 'QUESTION':
          // The wire truth is the flat list; the rich form only rides along from the
          // mock. Without it, lift the flat list into something renderable.
          return { ...state, question: agentEvent.form ?? liftQuestions(agentEvent.questions) };

        case 'ERROR':
          // Deliberately does NOT end the run: the backend keeps emitting its
          // finalize steps after an ERROR, and the stream closing is what ends
          // it (ADR-0003). Do not "fix" this into an early exit.
          return {
            ...state,
            error: { code: agentEvent.code, message: agentEvent.message },
          };

        case 'THINKING':
          return { ...state, thinking: state.thinking + agentEvent.delta };

        case 'CODE':
          return { ...state, codeText: state.codeText + agentEvent.delta };

        case 'TABLE':
          return {
            ...state,
            tables: [
              ...state.tables,
              {
                tableId: agentEvent.tableId,
                intent: agentEvent.intent,
                columns: agentEvent.columns,
                rows: agentEvent.rows,
                truncated: agentEvent.truncated,
              },
            ],
          };

        default:
          return state;
      }
    }

    case 'STOPPED':
      return { ...state, stopped: true };

    case 'FAILED':
      return { ...state, isStreaming: false, error: action.error };

    case 'DISCONNECTED':
      return {
        ...state,
        isStreaming: false,
        durationMs: action.durationMs,
        networkError: true,
        // Read here rather than held in a module constant: a constant is evaluated on
        // import, so it would keep whatever language was current then even after the
        // reader switched.
        error: { code: NETWORK_ERROR_CODE, message: getTranslations().chat.networkError },
      };

    case 'DONE':
      return { ...state, isStreaming: false, durationMs: action.durationMs };

    default:
      return state;
  }
};

export const useAgentStream = (
  sessionId: string,
): {
  state: AgentStreamState;
  send(input: SendInput): Promise<void>;
  stop(): void;
  reset(): void;
} => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  // The two delayed refetches an aborted run schedules (below). Kept so unmount can
  // clear them — without this they outlived the hook and fired invalidates against
  // the global queryClient up to 1.6s after the thread was gone.
  const abortRefetchTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // True only while the async generator is still delivering events. `stop` reads it to
  // tell a real mid-stream interruption from a click that lands in the finishing window
  // (after the last event, while the history refetch runs before DONE) — where the
  // button still says Stop but the run has actually completed.
  const receivingRef = useRef(false);

  // Both messages a run produced live server-side, and the sessions list moves too
  // (last-activity ordering). One invalidate covers both: the detail key is
  // ['sessions', id], which sits under the list's ['sessions'] prefix — invalidating
  // them separately made the detail refetch get cancelled and reissued every time.
  const invalidateSessionData = useCallback(
    () => queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
    [queryClient],
  );

  // Syncing with an external system (an open HTTP connection) is the one thing
  // useEffect is still for: a run left in flight after unmount holds the socket open
  // and dispatches into a torn-down reducer.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      for (const timer of abortRefetchTimersRef.current) {
        clearTimeout(timer);
      }
    },
    [],
  );

  const send = useCallback(
    async (input: SendInput): Promise<void> => {
      const startedAt = Date.now();
      dispatch({ type: 'START', startedAt });

      const controller = new AbortController();
      controllerRef.current = controller;
      receivingRef.current = true;

      try {
        for await (const event of streamAgentMessage({
          ...input,
          sessionId,
          signal: controller.signal,
        })) {
          dispatch({ type: 'EVENT', event });
        }
      } catch (error) {
        receivingRef.current = false;
        // A user-initiated stop is not a failure: the run simply ends where it is,
        // and everything already streamed stays on screen. The backend persists an
        // aborted run asynchronously (doOnCancel), so refetch in two delayed stages
        // instead of racing it now.
        if (isCanceled(error)) {
          dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
          abortRefetchTimersRef.current.push(
            setTimeout(() => {
              void invalidateSessionData();
              abortRefetchTimersRef.current.push(
                setTimeout(() => {
                  void invalidateSessionData();
                }, 800),
              );
            }, 800),
          );
          return;
        }

        if (error instanceof AgentStreamHttpError) {
          dispatch({ type: 'FAILED', error: { code: error.code, message: error.message } });
          return;
        }

        // Anything else is the connection dying under us: not user-initiated, and
        // not something the backend got to report.
        dispatch({ type: 'DISCONNECTED', durationMs: Date.now() - startedAt });
        return;
      }

      receivingRef.current = false;
      // Await before DONE: dispatching first would clear the live bubble while the
      // history is still stale, flashing the previous thread state.
      await invalidateSessionData();
      dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
    },
    [sessionId, invalidateSessionData],
  );

  const stop = useCallback((): void => {
    // Only a stream still being read can be stopped. A click after the last event —
    // in the finishing window, or on an idle hook — would flag `stopped` on a run that
    // completed, leaving a 「已停止」 ghost bubble beside the real reply.
    if (!receivingRef.current) {
      return;
    }
    // Flag it before aborting so the UI shows the stop immediately, rather than
    // waiting for AbortError to propagate out of the async generator.
    dispatch({ type: 'STOPPED' });
    controllerRef.current?.abort();
  }, []);

  const reset = useCallback((): void => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, send, stop, reset };
};
