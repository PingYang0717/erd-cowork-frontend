import { http, HttpResponse } from 'msw';

import type { Artifact, ArtifactVersion } from '@/types/api/artifact';
import type { Connector, ConnectorStatus } from '@/types/api/connector';
import type { Message } from '@/types/api/message';
import type { ScenarioKey } from '@/types/api/scenario';
import type { Session } from '@/types/api/session';
import type { Upload } from '@/types/api/upload';

import { ARTIFACT_FIXTURES, ARTIFACT_VERSION_CONTENT } from './artifactFixtures';
import { DIRECTORY_FIXTURES } from './directoryFixtures';
import { createPersistedResource } from './persistedResource';
import { matchScenario, SCENARIO_FIXTURES } from './scenarioFixtures';

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

const artifacts = createPersistedResource<Artifact>('erd-cowork:artifacts', [
  {
    id: 'artifact-1',
    sessionId: 'session-1',
    name: 'SPC analysis — Vt (gate CD)',
    kind: 'dashboard',
    scenario: 'spc',
    pinned: false,
    mine: true,
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
    mine: true,
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
    mine: false,
    shared: false,
    sharedBy: 'Alice Wu',
    createdAt: '2026-08-19T08:30:00.000Z',
  },
]);

const artifactVersions = createPersistedResource<ArtifactVersion>('erd-cowork:artifact-versions', [
  {
    id: 'artifact-1-v1',
    artifactId: 'artifact-1',
    n: 1,
    label: 'SPC analysis — Vt (gate CD) (draft)',
    createdAt: '2026-08-20T09:00:00.000Z',
  },
  {
    id: 'artifact-1-v2',
    artifactId: 'artifact-1',
    n: 2,
    label: 'SPC analysis — Vt (gate CD)',
    createdAt: '2026-08-20T09:15:00.000Z',
  },
]);

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
    const body = (await request.json()) as { text: string; scenarioKey?: ScenarioKey };
    const text = body.text?.trim();
    if (!text) {
      return new HttpResponse(null, { status: 400 });
    }

    const scenarioKey = body.scenarioKey ?? matchScenario(text);
    const fixture = SCENARIO_FIXTURES[scenarioKey];

    const artifact: Artifact = {
      id: crypto.randomUUID(),
      sessionId,
      name: fixture.artifactName,
      kind: 'dashboard',
      scenario: scenarioKey,
      pinned: false,
      mine: true,
      shared: false,
      createdAt: new Date().toISOString(),
    };
    artifacts.write([...artifacts.read(), artifact]);

    const version: ArtifactVersion = {
      id: crypto.randomUUID(),
      artifactId: artifact.id,
      n: 1,
      label: fixture.artifactName,
      createdAt: new Date().toISOString(),
    };
    artifactVersions.write([...artifactVersions.read(), version]);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'user',
      text,
    };
    const aiMessage: Message = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'ai',
      text: fixture.reply,
      scenario: scenarioKey,
      steps: fixture.steps,
      artifactName: fixture.artifactName,
      artifactId: artifact.id,
    };

    messages.write([...messages.read(), userMessage, aiMessage]);
    return HttpResponse.json({ userMessage, aiMessage }, { status: 201 });
  }),

  http.get('/api/artifacts', () => {
    return HttpResponse.json(artifacts.read());
  }),

  http.patch('/api/artifacts/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Pick<Artifact, 'pinned'>>;
    const all = artifacts.read();
    const existing = all.find((a) => a.id === params.id);
    if (!existing) {
      return new HttpResponse(null, { status: 404 });
    }
    const updated: Artifact = { ...existing, ...body };
    artifacts.write(all.map((a) => (a.id === params.id ? updated : a)));
    return HttpResponse.json(updated);
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
    const versionContent = versionId ? ARTIFACT_VERSION_CONTENT[versionId] : undefined;
    const html = versionContent
      ? versionContent[theme]
      : ARTIFACT_FIXTURES[artifact.scenario][theme];
    return HttpResponse.json({ html });
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
    };
    artifactVersions.write([...artifactVersions.read(), version]);
    return HttpResponse.json(version, { status: 201 });
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
    const updated: Artifact = { ...existing, shared: true };
    artifacts.write(all.map((a) => (a.id === params.id ? updated : a)));

    const url = `${new URL(request.url).origin}/cowork/artifact/${params.id}`;
    return HttpResponse.json({ url, artifact: updated });
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
