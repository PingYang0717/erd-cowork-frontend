import { http, HttpResponse } from 'msw';

import type { AgentEvent, QuestionForm, StepItem } from '@/types/api/agentEvent';
import type { Connector } from '@/types/api/connector';
import type { DcItem } from '@/types/api/dcItem';
import type { Message } from '@/types/api/message';
import type { ScenarioKey } from '@/types/api/scenario';

import type { ArtifactKind } from './artifactFixtures';
import { currentUser } from './currentUser';
import { DC_ITEM_FIXTURES, ROWS_PER_DC_ITEM } from './dcItemFixtures';
import { artifacts, type StoredArtifact } from './handlers.artifacts';
import { CATALOGUE } from './handlers.connectors';
import { sessionFiles } from './handlers.files';
import { sessionDataSources, upsertSession } from './handlers.sessions';
import { createPersistedResource } from './persistedResource';
import { dcItemQuestion, flattenQuestionForm, openingQuestion } from './questionFixtures';
import { matchScenario, SCENARIO_FIXTURES, SLIDES_STEP } from './scenarioFixtures';

// Cross-module writes (artifacts, session files, the session upsert) all happen inside
// the run handler at request time, so the import cycles with those modules are inert.

// Messages persist in the backend wire shape; sessionId is the mock store's own
// bookkeeping (the real backend nests messages inside SessionDetail) and is
// stripped before a Message reaches the client. Key versioned so browsers
// holding the pre-contract shape reseed.
interface StoredMessage extends Message {
  sessionId: string;
}

export const toMessageDto = (stored: StoredMessage): Message => {
  const { sessionId: _sessionId, ...rest } = stored;
  return rest;
};

export const messages = createPersistedResource<StoredMessage>('erd-cowork:messages:v2', [
  {
    id: 'message-1',
    sessionId: 'session-1',
    sender: 'AI',
    text: 'Control chart with CL / ±3σ limits and Western Electric rules applied to Vt (gate CD).',
    stepsJson: null,
    artifactId: 'artifact-1',
    createdAt: '2026-08-20T09:15:00.000Z',
    artifactTitle: 'SPC analysis — Vt (gate CD)',
    questionsJson: null,
  },
]);

// The mock's own artifact record. It is not a slice of the wire `Artifact`: the
// contract dropped `kind` (returning later as `type`) and never had `scenario`, but
// the mock needs both to decide which fixture HTML to build — while `isOwn`,
// `ownerDisplay`, `sessionTitle` and the permission flags are things a backend
// derives per request rather than stores. `toArtifactDto` does that deriving.
/** The data sources this session is actually drawing on, as the opening question's
 *  "Data type" options. Read at request time from the session's attachments — the panel
 *  writes them through PATCH /sessions/{id}/data-source — rather than from a fixture of
 *  its own, which is how the two used to disagree: a source connected in the panel never
 *  appeared in the question, and the test that "covered" this asserted the absent one
 *  was absent. */
const attachedConnectors = (sessionId: string): Connector[] => {
  const attached = new Set(
    sessionDataSources
      .read()
      .filter((link) => link.sessionId === sessionId)
      .map((link) => link.connectorId),
  );
  return CATALOGUE.filter((connector) => attached.has(connector.id)).map((connector) => ({
    ...connector,
    status: 'connected' as const,
  }));
};

// Session-level files per the backend contract (POST /sessions/{id}/files).

/** A run that has asked a question and is waiting on the user. `stage` says which
 *  question it is waiting on: an SPC run asks twice — once for its conditions, then
 *  again mid-flight once the scan finds more DC items than are worth charting at once. */
interface PendingRun {
  scenarioKey: ScenarioKey;
  artifactKind: ArtifactKind;
  form: QuestionForm;
  stage: 'conditions' | 'dc-item-scope';
}

const pendingRuns = new Map<string, PendingRun>();

/** Steps an SPC run gets through before it has to ask about DC items. */
const SCAN_STEP: StepItem = {
  stepKey: 'scan',
  title: '掃描 wafer / DC item',
  description: 'Inline DB · 近 7 天',
  status: 'SUCCESS',
};

const FILTER_STEP: StepItem = {
  stepKey: 'filter',
  title: '過濾至選定 DC item',
  description: null,
  status: 'SUCCESS',
};

// A run has to arrive over time, not in one blob. Delivered as a single chunk the whole
// thing lands in one microtask, React batches it into one render, and `isStreaming` goes
// true → false without ever being painted — so the working card, the step statuses and
// the typewriter reply are never seen. Tests that need to observe an intermediate state
// still drive their own stream (`src/test/agentStream.ts`); these delays only exist so
// mock mode behaves like the backend it stands in for.
let streamPaceMs = 340;
let tokenPaceMs = 22;

/** Collapses the pacing for tests. Tests that need to observe an intermediate state
 *  drive their own stream (`src/test/agentStream.ts`); the rest only care about where a
 *  run ends up, and should not wait seconds to find out. */
export const setStreamPace = (stepMs: number, tokenMs: number): void => {
  streamPaceMs = stepMs;
  tokenPaceMs = tokenMs;
};

const pace = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const sseResponse = (events: AgentEvent[]) => {
  const encoder = new TextEncoder();
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const event of events) {
        // The reader goes away when the user stops the run or leaves the page. Writing
        // into a controller nobody is reading throws, and an unpaced loop would keep
        // producing a run that has already been abandoned.
        if (cancelled) {
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

        // Pace 0 means "no pacing at all", not "a zero-length wait": a macrotask per
        // event is what makes a paced run visible, and tests that do not want the pacing
        // do not want the scheduling either.
        const delay = event.type === 'TOKEN' ? tokenPaceMs : streamPaceMs;
        if (delay > 0) {
          await pace(delay);
        }
      }

      if (!cancelled) {
        controller.close();
      }
    },

    cancel() {
      cancelled = true;
    },
  });

  return new HttpResponse(body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
};

/** Persists what the run produced, then replays it as an event stream. */
const streamRun = (
  sessionId: string,
  scenarioKey: ScenarioKey,
  artifactKind: ArtifactKind,
  leadingSteps: StepItem[] = [],
) => {
  const fixture = SCENARIO_FIXTURES[scenarioKey];
  const artifactName =
    artifactKind === 'slides' ? `${fixture.artifactName} (slides)` : fixture.artifactName;
  const scenarioSteps = artifactKind === 'slides' ? [...fixture.steps, SLIDES_STEP] : fixture.steps;
  const steps = [...leadingSteps, ...scenarioSteps];

  const artifact: StoredArtifact = {
    id: crypto.randomUUID(),
    sessionId,
    title: artifactName,
    kind: artifactKind,
    scenario: scenarioKey,
    ownerId: currentUser.id,
    createdAt: new Date().toISOString(),
    pinnedAt: null,
    // A run produces something only its author can see; publishing opens it to others.
    publishedAt: null,
    isShared: false,
  };
  artifacts.write([...artifacts.read(), artifact]);

  messages.write([
    ...messages.read(),
    {
      id: crypto.randomUUID(),
      sessionId,
      sender: 'AI',
      text: fixture.reply,
      stepsJson: JSON.stringify(steps),
      artifactId: artifact.id,
      createdAt: new Date().toISOString(),
      artifactTitle: artifactName,
      questionsJson: null,
    },
  ]);

  const events: AgentEvent[] = [];
  for (const step of steps) {
    events.push({ ...step, type: 'STEP', status: 'RUNNING' });
    events.push({ ...step, type: 'STEP', status: 'SUCCESS' });
  }
  events.push({ type: 'ARTIFACT', artifactId: artifact.id, title: artifactName });
  for (const word of fixture.reply.split(/(?<=\s)/)) {
    events.push({ type: 'TOKEN', delta: word });
  }
  events.push({ type: 'ANSWER', text: fixture.reply });

  return sseResponse(events);
};
const dcItems = createPersistedResource<DcItem>('erd-cowork:dc-items', DC_ITEM_FIXTURES);

export const messageHandlers = [
  http.post('/api/sessions/:sessionId/messages', async ({ params, request }) => {
    const sessionId = params.sessionId as string;
    // The backend body (SendMessageRequest) verbatim: question plus an optional
    // base artifact.
    const body = (await request.json()) as { question?: string; baseArtifactId?: string };

    const question = body.question?.trim();
    if (!question) {
      return HttpResponse.json(
        { code: 'EMPTY_MESSAGE', message: 'Message is empty' },
        { status: 400 },
      );
    }

    // Sending is what creates a session: the id comes from the client and this is an
    // upsert, not a lookup (ADR-0005 — the backend has no POST /sessions). A draft
    // becomes real here and nowhere else.
    upsertSession(sessionId);

    // Sending consumes the session's files, so the composer's chip row empties —
    // mirrors eRDWorkspace20260819.html. They are not snapshotted onto the message:
    // `Message` has no attachments on the wire.
    const allFiles = sessionFiles.read();
    if (allFiles.some((file) => file.sessionId === sessionId)) {
      sessionFiles.write(allFiles.filter((file) => file.sessionId !== sessionId));
    }

    messages.write([
      ...messages.read(),
      {
        id: crypto.randomUUID(),
        sessionId,
        sender: 'USER',
        text: question,
        stepsJson: null,
        artifactId: null,
        createdAt: new Date().toISOString(),
        artifactTitle: null,
        questionsJson: null,
      },
    ]);

    // A message that arrives while a reask is pending is its answer — the real
    // backend has no structured answers channel either, its LLM just reads on.
    const pending = pendingRuns.get(sessionId);
    if (pending) {
      // An SPC run scans first, then asks again before charting anything.
      if (pending.stage === 'conditions' && pending.scenarioKey === 'spc') {
        const form = dcItemQuestion(dcItems.read(), ROWS_PER_DC_ITEM);
        pendingRuns.set(sessionId, { ...pending, form, stage: 'dc-item-scope' });

        return sseResponse([
          { ...SCAN_STEP, type: 'STEP', status: 'RUNNING' },
          { ...SCAN_STEP, type: 'STEP', status: 'SUCCESS' },
          { type: 'QUESTION', questions: flattenQuestionForm(form), form },
        ]);
      }

      pendingRuns.delete(sessionId);
      const extraSteps = pending.stage === 'dc-item-scope' ? [SCAN_STEP, FILTER_STEP] : [];
      return streamRun(sessionId, pending.scenarioKey, pending.artifactKind, extraSteps);
    }

    // A fresh run: an explicit keyword in the question wins (a topic change), then an
    // iterated artifact's own scenario (baseArtifactId), then the default — the
    // mock's stand-in for the backend LLM reading the prompt.
    const baseArtifact = body.baseArtifactId
      ? artifacts.read().find((artifact) => artifact.id === body.baseArtifactId)
      : undefined;
    const scenarioKey = matchScenario(question) ?? baseArtifact?.scenario ?? 'spc';
    const artifactKind: ArtifactKind = /slides|deck|簡報/i.test(question)
      ? 'slides'
      : (baseArtifact?.kind ?? 'dashboard');

    // A Scenario decides what it needs to ask before it can run (ADR-0004) — but an
    // iteration whose scenario was inherited (a regenerate, a "make it tighter")
    // already has its conditions from the base run, so it runs straight away.
    const inherited = matchScenario(question) === null && baseArtifact !== undefined;
    const form = inherited ? null : openingQuestion(scenarioKey, attachedConnectors(sessionId));
    if (form) {
      pendingRuns.set(sessionId, { scenarioKey, artifactKind, form, stage: 'conditions' });
      return sseResponse([{ type: 'QUESTION', questions: flattenQuestionForm(form), form }]);
    }

    return streamRun(sessionId, scenarioKey, artifactKind);
  }),
];
