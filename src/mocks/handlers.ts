import { http, HttpResponse } from 'msw';

import { currentUser } from '@/config/currentUser';
import { DRAFT_SESSION_TITLE } from '@/constants/messages';
import type { AgentEvent, QuestionForm, StepItem } from '@/types/api/agentEvent';
import type { Artifact } from '@/types/api/artifact';
import type { Connector } from '@/types/api/connector';
import type { DcItem } from '@/types/api/dcItem';
import type { Message } from '@/types/api/message';
import type { ScenarioKey } from '@/types/api/scenario';
import type { Session } from '@/types/api/session';
import type { UploadedFileInfo } from '@/types/api/upload';

import type { ArtifactKind } from './artifactFixtures';
import { buildArtifactFixture } from './artifactFixtures';
import { DC_ITEM_FIXTURES, ROWS_PER_DC_ITEM } from './dcItemFixtures';
import { createPersistedResource } from './persistedResource';
import { dcItemQuestion, flattenQuestionForm, openingQuestion } from './questionFixtures';
import { matchScenario, SCENARIO_FIXTURES, SLIDES_STEP } from './scenarioFixtures';

interface ExampleWidget {
  id: string;
  name: string;
}

const exampleWidgets = createPersistedResource<ExampleWidget>('erd-cowork:example-widgets', [
  { id: 'w1', name: 'Inline Dashboard' },
  { id: 'w2', name: 'SPC Analysis' },
]);

// Messages persist in the backend wire shape; sessionId is the mock store's own
// bookkeeping (the real backend nests messages inside SessionDetail) and is
// stripped before a Message reaches the client. Key versioned so browsers
// holding the pre-contract shape reseed.
interface StoredMessage extends Message {
  sessionId: string;
}

function toMessageDto(stored: StoredMessage): Message {
  const { sessionId: _sessionId, ...rest } = stored;
  return rest;
}

const messages = createPersistedResource<StoredMessage>('erd-cowork:messages:v2', [
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
    scenario: 'spc',
  },
]);

// The mock's own artifact record. It is not a slice of the wire `Artifact`: the
// contract dropped `kind` (returning later as `type`) and never had `scenario`, but
// the mock needs both to decide which fixture HTML to build — while `isOwn`,
// `ownerDisplay`, `sessionTitle` and the permission flags are things a backend
// derives per request rather than stores. `toArtifactDto` does that deriving.
// Key bumped to v5 for the reshaped record.
const ALICE_USER_ID = 'u-002';
const OWNER_DISPLAY_NAMES: Record<string, string> = { [ALICE_USER_ID]: 'Alice Wu' };

interface StoredArtifact {
  id: string;
  sessionId: string;
  title: string;
  kind: ArtifactKind;
  scenario: ScenarioKey;
  ownerId: string;
  createdAt: string;
  pinnedAt: string | null;
  publishedAt: string | null;
  /** Shared out by its owner. Whether it was shared *to* you is `!isOwn`. */
  isShared: boolean;
}

const artifacts = createPersistedResource<StoredArtifact>('erd-cowork:artifacts:v5', [
  {
    id: 'artifact-1',
    sessionId: 'session-1',
    title: 'SPC analysis — Vt (gate CD)',
    kind: 'dashboard',
    scenario: 'spc',
    ownerId: currentUser.id,
    createdAt: '2026-08-20T09:15:00.000Z',
    pinnedAt: null,
    publishedAt: '2026-08-20T09:20:00.000Z',
    isShared: false,
  },
  {
    id: 'artifact-2',
    sessionId: 'session-1',
    title: 'Inline dashboard — W12',
    kind: 'dashboard',
    scenario: 'inline',
    ownerId: currentUser.id,
    createdAt: '2026-08-21T10:00:00.000Z',
    pinnedAt: '2026-08-21T10:05:00.000Z',
    publishedAt: '2026-08-21T10:02:00.000Z',
    isShared: false,
  },
  {
    id: 'artifact-3',
    sessionId: 'session-2',
    title: 'Daily monitor (A14)',
    kind: 'slides',
    scenario: 'daily',
    ownerId: ALICE_USER_ID,
    createdAt: '2026-08-19T08:30:00.000Z',
    pinnedAt: null,
    publishedAt: '2026-08-19T08:35:00.000Z',
    isShared: true,
  },
]);

function toArtifactDto(stored: StoredArtifact): Artifact {
  const isOwn = stored.ownerId === currentUser.id;
  return {
    id: stored.id,
    title: stored.title,
    sessionId: stored.sessionId,
    sessionTitle: sessions.read().find((session) => session.id === stored.sessionId)?.title ?? '',
    pinnedAt: stored.pinnedAt,
    publishedAt: stored.publishedAt,
    createdAt: stored.createdAt,
    owner: stored.ownerId,
    ownerDisplay: isOwn
      ? currentUser.name
      : (OWNER_DISPLAY_NAMES[stored.ownerId] ?? stored.ownerId),
    canPin: true,
    // Personal copies are not modelled, so "owner and non-copy" is just "owner".
    canShare: isOwn,
    isOwn,
    isShared: stored.isShared,
    hasPersonalCopy: false,
  };
}

const connectors = createPersistedResource<Connector>('erd-cowork:connectors', [
  {
    id: 'inline',
    name: 'Inline',
    description: 'In-line metrology & process parametric',
    category: 'Process',
    status: 'connected',
  },
  {
    id: 'wat',
    name: 'WAT',
    description: 'Wafer Acceptance Test (e-test parametric)',
    category: 'Test',
    status: 'connected',
  },
  {
    id: 'cp',
    name: 'CP',
    description: 'Circuit Probe / wafer sort bin & yield',
    category: 'Test',
    status: 'connected',
  },
  {
    id: 'lot',
    name: 'Lot Info',
    description: 'Lot genealogy, route & hold',
    category: 'Lot',
    status: 'available',
  },
  {
    id: 'lotabn',
    name: 'Lot Abnormal',
    description: 'Qtime OOS, running hold, inline OOS, etc.',
    category: 'Lot',
    status: 'available',
  },
  {
    id: 'process',
    name: 'Process',
    description: 'EXP Result, Qtime',
    category: 'Process',
    status: 'available',
  },
  {
    id: 'defect',
    name: 'Defect',
    description: 'Defect inspection & wafer map',
    category: 'Defect',
    status: 'available',
  },
  {
    id: 'tem',
    name: 'TEM',
    description: 'Cross-section TEM images & analysis',
    category: 'Physical',
    status: 'available',
  },
  {
    id: 'recipe',
    name: 'Recipe',
    description: 'Process recipe params & splits',
    category: 'Equipment',
    status: 'expired',
  },
  {
    id: 'tool',
    name: 'Offline Tool Log',
    description: 'Tool events, chamber & maintenance',
    category: 'Equipment',
    status: 'no_access',
  },
]);

// Session-level files per the backend contract (POST /sessions/{id}/files).
// sessionId is mock bookkeeping, stripped before a file reaches the client.
interface StoredFile extends UploadedFileInfo {
  sessionId: string;
}

function toFileDto(stored: StoredFile): UploadedFileInfo {
  const { sessionId: _sessionId, ...rest } = stored;
  return rest;
}

const sessionFiles = createPersistedResource<StoredFile>('erd-cowork:session-files', []);

/** Byte-level multipart parser: request.formData() can't be used here because undici
 *  brand-checks File entries and rejects jsdom's File in tests. latin1 maps one char
 *  per byte, so part sizes stay exact. Only metadata is kept — the mock never stores
 *  file contents. */
async function parseMultipartFiles(
  request: Request,
): Promise<{ name: string; size: number; type: string }[]> {
  const contentType = request.headers.get('content-type') ?? '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return [];
  }
  const boundary = `--${(boundaryMatch[1] ?? boundaryMatch[2]).trim()}`;
  const text = new TextDecoder('latin1').decode(await request.arrayBuffer());
  const parts = text.split(boundary).slice(1, -1);
  const files: { name: string; size: number; type: string }[] = [];
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      continue;
    }
    const headers = part.slice(0, headerEnd);
    const filenameMatch = headers.match(/filename="([^"]*)"/i);
    if (!filenameMatch) {
      continue;
    }
    const typeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
    // The part body runs from after the blank line to the \r\n preceding the
    // next boundary marker.
    const body = part.slice(headerEnd + 4, part.length - 2);
    files.push({ name: filenameMatch[1], size: body.length, type: (typeMatch?.[1] ?? '').trim() });
  }
  return files;
}

// :v2 — sessions persisted before this carry the old boolean `pinned` field.
const sessions = createPersistedResource<Session>('erd-cowork:sessions:v2', [
  {
    id: 'session-1',
    title: 'SPC — Vt (gate CD)',
    pinnedAt: '2026-08-20T09:05:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z',
  },
  {
    id: 'session-2',
    title: 'Defect pareto — W12',
    pinnedAt: null,
    updatedAt: '2026-08-19T09:00:00.000Z',
  },
]);

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
export function setStreamPace(stepMs: number, tokenMs: number): void {
  streamPaceMs = stepMs;
  tokenPaceMs = tokenMs;
}

function pace(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sseResponse(events: AgentEvent[]) {
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
}

/** Persists what the run produced, then replays it as an event stream. */
function streamRun(
  sessionId: string,
  scenarioKey: ScenarioKey,
  artifactKind: ArtifactKind,
  leadingSteps: StepItem[] = [],
) {
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
      scenario: scenarioKey,
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
}

const dcItems = createPersistedResource<DcItem>('erd-cowork:dc-items', DC_ITEM_FIXTURES);

/** Creates the session if this client has never sent to it before, and stamps its
 *  last activity either way. Mirrors ChatSession implementing Persistable<String>:
 *  the backend upserts on send rather than exposing a create endpoint. */
export function upsertSession(sessionId: string): void {
  const all = sessions.read();
  const existing = all.find((session) => session.id === sessionId);
  const now = new Date().toISOString();

  if (existing) {
    sessions.write(
      all.map((session) => (session.id === sessionId ? { ...session, updatedAt: now } : session)),
    );
    return;
  }

  sessions.write([
    ...all,
    { id: sessionId, title: DRAFT_SESSION_TITLE, pinnedAt: null, updatedAt: now },
  ]);
}

function setPublished(id: string | readonly string[] | undefined, published: boolean) {
  const all = artifacts.read();
  const existing = all.find((artifact) => artifact.id === id);
  if (!existing) {
    return new HttpResponse(null, { status: 404 });
  }
  const updated: StoredArtifact = {
    ...existing,
    publishedAt: published ? new Date().toISOString() : null,
  };
  artifacts.write(all.map((artifact) => (artifact.id === id ? updated : artifact)));
  return HttpResponse.json(toArtifactDto(updated));
}

/** Each artifact IS a version (deriveArtifactVersions); number it the way the client
 *  does — by its position among the session's artifact-bearing messages — so the
 *  rendered "· vN" matches the menu. */
function artifactVersionNumber(artifact: { id: string; sessionId: string }): number {
  const artifactMessages = messages
    .read()
    .filter((m) => m.sessionId === artifact.sessionId && m.artifactId != null);
  const index = artifactMessages.findIndex((m) => m.artifactId === artifact.id);
  return index >= 0 ? index + 1 : 1;
}

export const allHandlers = [
  // The limits the backend enforces, mirrored here so the UI reads one source in both
  // transports. Values match cowork master's defaults.
  http.get('/api/config', () =>
    HttpResponse.json({
      retentionDays: 30,
      maxFiles: 5,
      maxSessionBytes: 5 * 1024 * 1024 * 1024,
      singleFileLimits: {
        csv: 2 * 1024 * 1024 * 1024,
        xlsx: 200 * 1024 * 1024,
        xls: 200 * 1024 * 1024,
      },
    }),
  ),

  http.get('/api/example-widgets', () => {
    return HttpResponse.json(exampleWidgets.read());
  }),

  http.get('/api/sessions', () => {
    return HttpResponse.json(sessions.read());
  }),

  // The backend has no standalone messages endpoint: a session's messages and
  // files are nested inside its detail.
  http.get('/api/sessions/:sessionId', ({ params }) => {
    const session = sessions.read().find((s) => s.id === params.sessionId);
    if (!session) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      id: session.id,
      title: session.title,
      // The mock's Session seeds carry no createdAt of their own; updatedAt is
      // the closest truth it has.
      createdAt: session.updatedAt,
      messages: messages
        .read()
        .filter((message) => message.sessionId === session.id)
        .map(toMessageDto),
      files: sessionFiles
        .read()
        .filter((file) => file.sessionId === session.id)
        .map(toFileDto),
    });
  }),

  http.post('/api/sessions/:sessionId/files', async ({ params, request }) => {
    const sessionId = params.sessionId as string;
    const incoming = await parseMultipartFiles(request);
    if (incoming.length === 0) {
      return new HttpResponse(null, { status: 400 });
    }
    // Uploading upserts the session too — the backend has two write endpoints and both
    // create the session on first use (ADR-0008). Without this, attaching a file to a
    // draft leaves the detail endpoint 404ing.
    upsertSession(sessionId);
    const existingCount = sessionFiles.read().filter((f) => f.sessionId === sessionId).length;
    const created: StoredFile[] = incoming.map((file, index) => ({
      id: crypto.randomUUID(),
      sessionId,
      name: file.name,
      alias: `t${existingCount + index + 1}`,
      sizeBytes: file.size,
      type: file.type || 'text/csv',
      rowCount: null,
      expired: false,
    }));
    sessionFiles.write([...sessionFiles.read(), ...created]);
    return HttpResponse.json(created.map(toFileDto), { status: 201 });
  }),

  http.delete('/api/sessions/:sessionId/files/:fileId', ({ params }) => {
    const all = sessionFiles.read();
    sessionFiles.write(all.filter((file) => file.id !== params.fileId));
    return new HttpResponse(null, { status: 204 });
  }),

  // A run is delivered as an agent-event stream, not a computed reply (ADR-0005).
  // The whole scripted run is written at once and the stream closed: tests that need
  // to observe an intermediate state drive their own stream via `src/test/agentStream.ts`
  // instead of racing this one.
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
    // upsert, not a lookup (ADR-0008 — the backend has no POST /sessions). A draft
    // becomes real here and nowhere else.
    upsertSession(sessionId);

    // Snapshot the session's files onto the user message (the 前端-only extension
    // behind the mockup's in-bubble chips), then consume them so the composer's
    // chips row empties — mirrors eRDWorkspace20260819.html.
    const allFiles = sessionFiles.read();
    const consumedFiles = allFiles.filter((file) => file.sessionId === sessionId);
    if (consumedFiles.length > 0) {
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
        attachments: consumedFiles.length > 0 ? consumedFiles.map(toFileDto) : undefined,
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

    // A Scenario decides what it needs to ask before it can run (ADR-0006) — but an
    // iteration whose scenario was inherited (a regenerate, a "make it tighter")
    // already has its conditions from the base run, so it runs straight away.
    const inherited = matchScenario(question) === null && baseArtifact !== undefined;
    const form = inherited ? null : openingQuestion(scenarioKey, connectors.read());
    if (form) {
      pendingRuns.set(sessionId, { scenarioKey, artifactKind, form, stage: 'conditions' });
      return sseResponse([{ type: 'QUESTION', questions: flattenQuestionForm(form), form }]);
    }

    return streamRun(sessionId, scenarioKey, artifactKind);
  }),

  http.get('/api/artifacts', () => {
    return HttpResponse.json(artifacts.read().map(toArtifactDto));
  }),

  /** Toggle: which way it goes is the backend's call, so the request carries no
   *  direction and the client cannot act on a stale reading of its own. */
  http.post('/api/artifacts/:id/pin', ({ params }) => {
    const all = artifacts.read();
    const existing = all.find((artifact) => artifact.id === params.id);
    if (!existing) {
      return new HttpResponse(null, { status: 404 });
    }
    const updated: StoredArtifact = {
      ...existing,
      pinnedAt: existing.pinnedAt === null ? new Date().toISOString() : null,
    };
    artifacts.write(all.map((artifact) => (artifact.id === params.id ? updated : artifact)));
    return HttpResponse.json(toArtifactDto(updated));
  }),

  /** 發布 / 取消發布 — split by method, and the timestamp is the server's to write. */
  http.post('/api/artifacts/:id/publish', ({ params }) => setPublished(params.id, true)),

  http.delete('/api/artifacts/:id/publish', ({ params }) => setPublished(params.id, false)),

  http.get('/api/artifacts/:id', ({ params, request }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    const searchParams = new URL(request.url).searchParams;
    const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light';
    const fixture = buildArtifactFixture(
      artifact.scenario,
      artifact.kind,
      artifactVersionNumber(artifact),
    );
    // The backend serves text/html directly, not { html } JSON; theme is a query
    // extension only the mock reads (a real backend ignores it).
    return new HttpResponse(fixture[theme], { headers: { 'Content-Type': 'text/html' } });
  }),

  // The artifact's source before assembly. The chat bubble lazy-fetches it when the
  // reader expands "view HTML"; the light fixture stands in for the un-themed source.
  http.get('/api/artifacts/:id/raw', ({ params }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    const fixture = buildArtifactFixture(
      artifact.scenario,
      artifact.kind,
      artifactVersionNumber(artifact),
    );
    return new HttpResponse(fixture.light, { headers: { 'Content-Type': 'text/plain' } });
  }),

  // Rebuilding an artifact whose HTML threw. Every repair here succeeds — a real
  // backend can also come back empty-handed, which the UI already handles; tests
  // exercise that path by stubbing this endpoint.
  http.post('/api/artifacts/:id/repair', ({ params }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ repaired: true });
  }),
];

/** Every handler, registered for tests. The app itself no longer runs MSW — see
 *  ADR-0009; endpoints the backend has not built are stubbed in `src/api/`. */
export const handlers = allHandlers;
