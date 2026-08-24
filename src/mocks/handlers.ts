import { http, HttpResponse } from 'msw';

import { currentUser } from '@/services/currentUser';
import type { Artifact, ArtifactKind, ArtifactVersion } from '@/types/api/artifact';
import type { Connector, ConnectorStatus } from '@/types/api/connector';
import type { Message } from '@/types/api/message';
import type { ScenarioKey } from '@/types/api/scenario';
import type { Session } from '@/types/api/session';
import type { Upload } from '@/types/api/upload';

import { ARTIFACT_VERSION_CONTENT, buildArtifactFixture } from './artifactFixtures';
import { DIRECTORY_FIXTURES } from './directoryFixtures';
import { createPersistedResource } from './persistedResource';
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

  http.post('/api/sessions/:sessionId/messages', async ({ params, request }) => {
    const sessionId = params.sessionId as string;
    const body = (await request.json()) as {
      text: string;
      scenarioKey?: ScenarioKey;
      artifactKind?: ArtifactKind;
      attachments?: Upload[];
    };
    const text = body.text?.trim();
    if (!text) {
      return new HttpResponse(null, { status: 400 });
    }

    const scenarioKey = body.scenarioKey ?? matchScenario(text);
    const artifactKind = body.artifactKind ?? 'dashboard';
    const fixture = SCENARIO_FIXTURES[scenarioKey];
    const artifactName =
      artifactKind === 'slides' ? `${fixture.artifactName} (slides)` : fixture.artifactName;
    const steps = artifactKind === 'slides' ? [...fixture.steps, SLIDES_STEP] : fixture.steps;

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

    const version: ArtifactVersion = {
      id: crypto.randomUUID(),
      artifactId: artifact.id,
      n: 1,
      label: artifactName,
      createdAt: new Date().toISOString(),
      generated: false,
    };
    artifactVersions.write([...artifactVersions.read(), version]);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'user',
      text,
      attachments: body.attachments?.length ? body.attachments : undefined,
    };
    const aiMessage: Message = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'ai',
      text: fixture.reply,
      scenario: scenarioKey,
      steps,
      artifactName,
      artifactId: artifact.id,
    };

    messages.write([...messages.read(), userMessage, aiMessage]);
    return HttpResponse.json({ userMessage, aiMessage }, { status: 201 });
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
