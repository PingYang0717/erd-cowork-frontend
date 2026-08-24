import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AgentEvent, QuestionForm, StepItem, TableResult } from '@/types/api/agentEvent';

import { AgentStreamHttpError, type SendMessageArgs, streamAgentMessage } from '../api/agentApi';

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
  // thread history (ADR-0005).
  thinking: string;
  codeText: string;
  tables: TableResult[];
  /** Wall-clock milliseconds the finished run took; null while idle or streaming. */
  durationMs: number | null;
}

type Action =
  | { type: 'START' }
  | { type: 'RESET' }
  | { type: 'EVENT'; event: AgentEvent }
  | { type: 'STOPPED' }
  | { type: 'FAILED'; error: { code: string; message: string } }
  | { type: 'DISCONNECTED'; durationMs: number }
  | { type: 'DONE'; durationMs: number };

const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
// English to match every other string on this surface; the mockup's Chinese copy is
// confined to the clarification forms.
const NETWORK_ERROR_MESSAGE = 'Connection lost — send it again.';

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
};

/** A step is identified by its `stepKey`: a later event for the same key is a status
 *  transition, not a new step, and must not move it in the list. */
function upsertStep(steps: StepItem[], incoming: StepItem): StepItem[] {
  const existingIndex = steps.findIndex((step) => step.stepKey === incoming.stepKey);

  if (existingIndex === -1) {
    return [...steps, incoming];
  }

  return steps.map((step, index) => (index === existingIndex ? incoming : step));
}

function reducer(state: AgentStreamState, action: Action): AgentStreamState {
  switch (action.type) {
    case 'START':
      return { ...initialState, isStreaming: true };

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
          return { ...state, question: agentEvent.form };

        case 'ERROR':
          // Deliberately does NOT end the run: the backend keeps emitting its
          // finalize steps after an ERROR, and the stream closing is what ends
          // it (ADR-0005). Do not "fix" this into an early exit.
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
        error: { code: NETWORK_ERROR_CODE, message: NETWORK_ERROR_MESSAGE },
      };

    case 'DONE':
      return { ...state, isStreaming: false, durationMs: action.durationMs };

    default:
      return state;
  }
}

export function useAgentStream(sessionId: string): {
  state: AgentStreamState;
  send(input: SendInput): Promise<void>;
  stop(): void;
  reset(): void;
} {
  const [state, dispatch] = useReducer(reducer, initialState);
  const controllerRef = useRef<AbortController | null>(null);

  // Syncing with an external system (an open HTTP connection) is the one thing
  // useEffect is still for: a run left in flight after unmount holds the socket open
  // and dispatches into a torn-down reducer.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const send = useCallback(
    async (input: SendInput): Promise<void> => {
      dispatch({ type: 'START' });
      const startedAt = Date.now();

      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        for await (const event of streamAgentMessage({
          ...input,
          sessionId,
          signal: controller.signal,
        })) {
          dispatch({ type: 'EVENT', event });
        }
      } catch (error) {
        // A user-initiated stop is not a failure: the run simply ends where it is,
        // and everything already streamed stays on screen.
        if (error instanceof Error && error.name === 'AbortError') {
          dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
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

      dispatch({ type: 'DONE', durationMs: Date.now() - startedAt });
    },
    [sessionId],
  );

  const stop = useCallback((): void => {
    // Flag it before aborting so the UI shows the stop immediately, rather than
    // waiting for AbortError to propagate out of the async generator.
    dispatch({ type: 'STOPPED' });
    controllerRef.current?.abort();
  }, []);

  const reset = useCallback((): void => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, send, stop, reset };
}
