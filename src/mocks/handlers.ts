import { http, HttpResponse } from 'msw';

import { currentUser } from '@/services/currentUser';
import type { AgentEvent, QuestionAnswer, QuestionForm, StepItem } from '@/types/api/agentEvent';
import type { Artifact, ArtifactKind, ArtifactVersion } from '@/types/api/artifact';
import type { Connector, ConnectorStatus } from '@/types/api/connector';
import type { DcItem } from '@/types/api/dcItem';
import type { Message } from '@/types/api/message';
import type { ScenarioKey } from '@/types/api/scenario';
import type { Session } from '@/types/api/session';
import type { Upload } from '@/types/api/upload';

import { ARTIFACT_VERSION_CONTENT, buildArtifactFixture } from './artifactFixtures';
import { DC_ITEM_FIXTURES, ROWS_PER_DC_ITEM } from './dcItemFixtures';
import { DIRECTORY_FIXTURES } from './directoryFixtures';
import { createPersistedResource } from './persistedResource';
import { dcItemQuestion, openingQuestion } from './questionFixtures';
import { matchScenario, SCENARIO_FIXTURES, SLIDES_STEP } from './scenarioFixtures';

interface ExampleWidget {
  id: string;
  name: string;
}

const exampleWidgets = createPersistedResource<ExampleWidget>('erd-cowork:example-widgets', [
  { id: 'w1', name: 'Inline Dashboard' },
  { id: 'w2', name: 'SPC Analysis' },
]);

const messages = createPersistedResource<Message>('erd-cowork:messages', [
  {
    id: 'message-1',
    sessionId: 'session-1',
    role: 'ai',
    text: 'Control chart with CL / ±3σ limits and Western Electric rules applied to Vt (gate CD).',
    scenario: 'spc',
    artifactName: 'SPC analysis — Vt (gate CD)',
    artifactId: 'artifact-1',
  },
]);

// Who owns an Artifact is the backend's business: it is stored as ownerId and
// reaches the client only as Artifact.mine, resolved against the mock identity
// in services/currentUser.ts. The storage key is suffixed so a browser holding
// the older seeded shape (which carried mine directly) reseeds instead of
// resolving every Artifact to "not yours".
const ALICE_USER_ID = 'u-002';

interface StoredArtifact extends Omit<Artifact, 'mine' | 'generated'> {
  ownerId: string;
}

function toArtifactDto(stored: StoredArtifact): Artifact {
  const { ownerId, ...rest } = stored;
  return {
    ...rest,
    mine: ownerId === currentUser.id,
    generated: artifactVersions.read().some((v) => v.artifactId === stored.id && v.generated),
  };
}

const artifacts = createPersistedResource<StoredArtifact>('erd-cowork:artifacts:v2', [
  {
    id: 'artifact-1',
    sessionId: 'session-1',
    name: 'SPC analysis — Vt (gate CD)',
    kind: 'dashboard',
    scenario: 'spc',
    pinned: false,
    ownerId: currentUser.id,
    shared: false,
    createdAt: '2026-08-20T09:15:00.000Z',
  },
  {
    id: 'artifact-2',
    sessionId: 'session-1',
    name: 'Inline dashboard — W12',
    kind: 'dashboard',
    scenario: 'inline',
    pinned: true,
    ownerId: currentUser.id,
    shared: false,
    createdAt: '2026-08-21T10:00:00.000Z',
  },
  {
    id: 'artifact-3',
    sessionId: 'session-2',
    name: 'Daily monitor (A14)',
    kind: 'slides',
    scenario: 'daily',
    pinned: false,
    ownerId: ALICE_USER_ID,
    shared: false,
    sharedBy: 'Alice Wu',
    createdAt: '2026-08-19T08:30:00.000Z',
  },
]);

// Storage key is versioned: browsers holding the older seeded shape (without
// the per-version `generated` flag) reseed instead of resolving every version
// to "not generated".
const artifactVersions = createPersistedResource<ArtifactVersion>(
  'erd-cowork:artifact-versions:v2',
  [
    {
      id: 'artifact-1-v1',
      artifactId: 'artifact-1',
      n: 1,
      label: 'SPC analysis — Vt (gate CD) (draft)',
      createdAt: '2026-08-20T09:00:00.000Z',
      generated: true,
    },
    {
      id: 'artifact-1-v2',
      artifactId: 'artifact-1',
      n: 2,
      label: 'SPC analysis — Vt (gate CD)',
      createdAt: '2026-08-20T09:15:00.000Z',
      generated: true,
    },
    {
      id: 'artifact-2-v1',
      artifactId: 'artifact-2',
      n: 1,
      label: 'Inline dashboard — W12',
      createdAt: '2026-08-21T10:00:00.000Z',
      generated: true,
    },
    {
      id: 'artifact-3-v1',
      artifactId: 'artifact-3',
      n: 1,
      label: 'Daily monitor (A14)',
      createdAt: '2026-08-19T08:30:00.000Z',
      generated: true,
    },
  ],
);

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

const sessions = createPersistedResource<Session>('erd-cowork:sessions', [
  {
    id: 'session-1',
    title: 'SPC — Vt (gate CD)',
    pinned: true,
    updatedAt: '2026-08-20T09:00:00.000Z',
  },
  {
    id: 'session-2',
    title: 'Defect pareto — W12',
    pinned: false,
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

function sseResponse(events: AgentEvent[]) {
  const sse = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  return new HttpResponse(sse, {
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
    name: artifactName,
    kind: artifactKind,
    scenario: scenarioKey,
    pinned: false,
    ownerId: currentUser.id,
    shared: false,
    createdAt: new Date().toISOString(),
  };
  artifacts.write([...artifacts.read(), artifact]);

  artifactVersions.write([
    ...artifactVersions.read(),
    {
      id: crypto.randomUUID(),
      artifactId: artifact.id,
      n: 1,
      label: artifactName,
      createdAt: new Date().toISOString(),
      generated: false,
    },
  ]);

  messages.write([
    ...messages.read(),
    {
      id: crypto.randomUUID(),
      sessionId,
      role: 'ai',
      text: fixture.reply,
      scenario: scenarioKey,
      steps,
      artifactName,
      artifactId: artifact.id,
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

export const handlers = [
  http.get('/api/example-widgets', () => {
    return HttpResponse.json(exampleWidgets.read());
  }),

  http.get('/api/sessions', () => {
    return HttpResponse.json(sessions.read());
  }),

  http.post('/api/sessions', async ({ request }) => {
    const body = (await request.json()) as Partial<Pick<Session, 'title'>>;
    const session: Session = {
      id: crypto.randomUUID(),
      title: body.title?.trim() || 'New analysis',
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    sessions.write([...sessions.read(), session]);
    return HttpResponse.json(session, { status: 201 });
  }),

  http.patch('/api/sessions/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Pick<Session, 'title' | 'pinned'>>;
    const all = sessions.read();
    const existing = all.find((session) => session.id === params.id);
    if (!existing) {
      return new HttpResponse(null, { status: 404 });
    }
    const updated: Session = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    sessions.write(all.map((session) => (session.id === params.id ? updated : session)));
    return HttpResponse.json(updated);
  }),

  http.delete('/api/sessions/:id', ({ params }) => {
    const all = sessions.read();
    sessions.write(all.filter((session) => session.id !== params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/sessions/:sessionId/messages', ({ params }) => {
    const all = messages.read();
    return HttpResponse.json(all.filter((message) => message.sessionId === params.sessionId));
  }),

  // A run is delivered as an agent-event stream, not a computed reply (ADR-0005).
  // The whole scripted run is written at once and the stream closed: tests that need
  // to observe an intermediate state drive their own stream via `src/test/agentStream.ts`
  // instead of racing this one.
  http.post('/api/sessions/:sessionId/messages', async ({ params, request }) => {
    const sessionId = params.sessionId as string;
    const body = (await request.json()) as {
      text?: string;
      scenarioKey?: ScenarioKey;
      artifactKind?: ArtifactKind;
      attachments?: Upload[];
      answers?: Record<string, QuestionAnswer>;
      inReplyTo?: string;
    };

    // Answering a reask resumes the run the reask belongs to, so the scenario is
    // whatever was pending for this session rather than anything in this request.
    if (body.answers && body.inReplyTo) {
      const pending = pendingRuns.get(sessionId);
      if (!pending) {
        return HttpResponse.json(
          { code: 'NO_PENDING_QUESTION', message: 'Nothing was waiting on an answer' },
          { status: 409 },
        );
      }
      messages.write([
        ...messages.read(),
        {
          id: crypto.randomUUID(),
          sessionId,
          role: 'ai',
          text: '',
          answeredForm: pending.form,
          answers: body.answers,
        },
      ]);

      // An SPC run scans first, then asks again before charting anything.
      if (pending.stage === 'conditions' && pending.scenarioKey === 'spc') {
        const form = dcItemQuestion(dcItems.read(), ROWS_PER_DC_ITEM);
        pendingRuns.set(sessionId, { ...pending, form, stage: 'dc-item-scope' });

        return sseResponse([
          { ...SCAN_STEP, type: 'STEP', status: 'RUNNING' },
          { ...SCAN_STEP, type: 'STEP', status: 'SUCCESS' },
          { type: 'QUESTION', form },
        ]);
      }

      pendingRuns.delete(sessionId);
      const extraSteps = pending.stage === 'dc-item-scope' ? [SCAN_STEP, FILTER_STEP] : [];
      return streamRun(sessionId, pending.scenarioKey, pending.artifactKind, extraSteps);
    }

    const text = body.text?.trim();
    if (!text) {
      return HttpResponse.json(
        { code: 'EMPTY_MESSAGE', message: 'Message is empty' },
        { status: 400 },
      );
    }

    const scenarioKey = body.scenarioKey ?? matchScenario(text);
    const artifactKind = body.artifactKind ?? 'dashboard';

    messages.write([
      ...messages.read(),
      {
        id: crypto.randomUUID(),
        sessionId,
        role: 'user',
        text,
        attachments: body.attachments?.length ? body.attachments : undefined,
      },
    ]);

    // A Scenario decides what it needs to ask before it can run (ADR-0006).
    const form = openingQuestion(scenarioKey, connectors.read());
    if (form) {
      pendingRuns.set(sessionId, { scenarioKey, artifactKind, form, stage: 'conditions' });
      return sseResponse([{ type: 'QUESTION', form }]);
    }

    return streamRun(sessionId, scenarioKey, artifactKind);
  }),

  http.get('/api/dc-items', () => HttpResponse.json(dcItems.read())),

  http.post('/api/dc-items', async ({ request }) => {
    const { name } = (await request.json()) as { name: string };
    const id = name.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = dcItems.read().find((item) => item.id === id);
    if (existing) {
      return HttpResponse.json(existing, { status: 200 });
    }

    // A custom item has no spec limits of its own — it is charted without them.
    const created: DcItem = { id, name: name.trim(), unit: '', lo: 0, hi: 0, custom: true };
    dcItems.write([...dcItems.read(), created]);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get('/api/artifacts', () => {
    return HttpResponse.json(artifacts.read().map(toArtifactDto));
  }),

  http.patch('/api/artifacts/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Pick<Artifact, 'pinned'>>;
    const all = artifacts.read();
    const existing = all.find((a) => a.id === params.id);
    if (!existing) {
      return new HttpResponse(null, { status: 404 });
    }
    const updated: StoredArtifact = { ...existing, ...body };
    artifacts.write(all.map((a) => (a.id === params.id ? updated : a)));
    return HttpResponse.json(toArtifactDto(updated));
  }),

  http.delete('/api/artifacts/:id', ({ params }) => {
    const all = artifacts.read();
    artifacts.write(all.filter((a) => a.id !== params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/artifacts/:id', ({ params, request }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    const searchParams = new URL(request.url).searchParams;
    const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light';
    const versionId = searchParams.get('versionId');
    const versions = artifactVersions.read().filter((v) => v.artifactId === artifact.id);
    const version = versionId
      ? versions.find((v) => v.id === versionId)
      : versions[versions.length - 1];
    const fixture =
      (versionId ? ARTIFACT_VERSION_CONTENT[versionId] : undefined) ??
      buildArtifactFixture(artifact.scenario, artifact.kind, version?.n);
    return HttpResponse.json({ html: fixture[theme] });
  }),

  // Rebuilding an artifact whose HTML threw. Every repair here succeeds and bumps a
  // version — a real backend can also come back empty-handed, which the UI already
  // handles; tests exercise that path by stubbing this endpoint.
  http.post('/api/artifacts/:id/repair', ({ params }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }

    const versions = artifactVersions.read();
    const mine = versions.filter((v) => v.artifactId === artifact.id);
    artifactVersions.write([
      ...versions,
      {
        id: crypto.randomUUID(),
        artifactId: artifact.id,
        n: mine.length + 1,
        label: artifact.name,
        createdAt: new Date().toISOString(),
        generated: false,
      },
    ]);

    return HttpResponse.json({ repaired: true });
  }),

  http.get('/api/artifacts/:id/versions', ({ params }) => {
    const versions = artifactVersions.read().filter((v) => v.artifactId === params.id);
    return HttpResponse.json(versions);
  }),

  http.post('/api/artifacts/:id/regenerate', ({ params }) => {
    const artifact = artifacts.read().find((a) => a.id === params.id);
    if (!artifact) {
      return new HttpResponse(null, { status: 404 });
    }
    const existingVersions = artifactVersions.read().filter((v) => v.artifactId === params.id);
    const maxN = existingVersions.reduce((max, v) => Math.max(max, v.n), 0);
    const version: ArtifactVersion = {
      id: crypto.randomUUID(),
      artifactId: artifact.id,
      n: maxN + 1,
      label: artifact.name,
      createdAt: new Date().toISOString(),
      generated: false,
    };
    artifactVersions.write([...artifactVersions.read(), version]);
    return HttpResponse.json(version, { status: 201 });
  }),

  http.post('/api/artifacts/:id/versions/:versionId/generate', ({ params }) => {
    const all = artifactVersions.read();
    const existing = all.find((v) => v.artifactId === params.id && v.id === params.versionId);
    if (!existing) {
      return new HttpResponse(null, { status: 404 });
    }
    const updated: ArtifactVersion = { ...existing, generated: true };
    artifactVersions.write(all.map((v) => (v.id === updated.id ? updated : v)));
    return HttpResponse.json(updated);
  }),

  http.post('/api/artifacts/:id/share', async ({ params, request }) => {
    const all = artifacts.read();
    const existing = all.find((a) => a.id === params.id);
    if (!existing) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = (await request.json()) as { targetIds: string[] };
    if (!body.targetIds?.length) {
      return new HttpResponse(null, { status: 400 });
    }
    const updated: StoredArtifact = { ...existing, shared: true };
    artifacts.write(all.map((a) => (a.id === params.id ? updated : a)));

    const url = `${new URL(request.url).origin}/cowork/artifact/${params.id}`;
    return HttpResponse.json({ url, artifact: toArtifactDto(updated) });
  }),

  http.get('/api/directory', () => {
    return HttpResponse.json(DIRECTORY_FIXTURES);
  }),

  http.get('/api/connectors', () => {
    return HttpResponse.json(connectors.read());
  }),

  http.patch('/api/connectors/:id', async ({ params, request }) => {
    const body = (await request.json()) as { status: ConnectorStatus };
    const all = connectors.read();
    const existing = all.find((c) => c.id === params.id);
    if (!existing) {
      return new HttpResponse(null, { status: 404 });
    }
    const updated: Connector = { ...existing, status: body.status };
    connectors.write(all.map((c) => (c.id === params.id ? updated : c)));
    return HttpResponse.json(updated);
  }),

  http.post('/api/connectors', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const name = body.name?.trim();
    if (!name) {
      return new HttpResponse(null, { status: 400 });
    }
    const id =
      'c_' +
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    const all = connectors.read();
    const existing = all.find((c) => c.id === id);
    if (existing) {
      return HttpResponse.json(existing);
    }
    const created: Connector = {
      id,
      name,
      description: 'Custom RD data source',
      category: 'Custom',
      status: 'connected',
      custom: true,
    };
    connectors.write([...all, created]);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post('/api/uploads', async ({ request }) => {
    const body = (await request.json()) as { fileName: string; sizeBytes: number };
    const upload: Upload = {
      id: crypto.randomUUID(),
      fileName: body.fileName,
      sizeBytes: body.sizeBytes,
    };
    return HttpResponse.json(upload, { status: 201 });
  }),
];
