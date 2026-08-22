# eRD Cowork API Interface

This is the single source of truth for the mock backend's API contract. Every
endpoint the frontend calls through `services/apiClient.ts` is mocked by MSW
(`src/mocks/handlers.ts`) against the shape documented here. The corresponding
TypeScript DTOs live in `src/types/api/`.

When a real backend replaces MSW, it should implement each endpoint below to
match; the frontend's calling code should not need to change.

Each feature ticket appends its own endpoints to the relevant section below as
it implements them.

## Session

| Method | Path            | Request                                       | Response        |
| ------ | --------------- | --------------------------------------------- | --------------- |
| GET    | `/sessions`     | —                                             | `Session[]`     |
| POST   | `/sessions`     | `{}` (title defaults to `"New analysis"`)     | `Session` (201) |
| PATCH  | `/sessions/:id` | `Partial<Pick<Session, 'title' \| 'pinned'>>` | `Session`       |
| DELETE | `/sessions/:id` | —                                             | 204 No Content  |

## Message / Chat

| Method | Path                            | Request                                       | Response                                             |
| ------ | ------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| GET    | `/sessions/:sessionId/messages` | —                                             | `Message[]`                                          |
| POST   | `/sessions/:sessionId/messages` | `{ text: string; scenarioKey?: ScenarioKey }` | `{ userMessage: Message; aiMessage: Message }` (201) |

`scenarioKey` is optional on the request: suggested-prompt buttons send it explicitly,
while free text is keyword/regex-matched server-side (mock) to one of `spc` / `inline` /
`daily` / `cptest`. The response's `aiMessage` already carries the fully-resolved
`steps` and final `text` — the client is responsible for revealing them progressively
via a local timer (no real streaming). Sending a message also creates the produced
`Artifact` record server-side; `aiMessage.artifactId` references it (`artifactName`
remains as a display-only convenience so the chat bubble doesn't need a join).

## Artifact

| Method | Path                      | Request                                                                                              | Response                              |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| GET    | `/artifacts`              | —                                                                                                    | `Artifact[]`                          |
| GET    | `/artifacts/:id`          | `?theme=light\|dark` (defaults to `light`), `?versionId=` (optional, defaults to the latest version) | `{ html: string }`                    |
| PATCH  | `/artifacts/:id`          | `Partial<Pick<Artifact, 'pinned'>>`                                                                  | `Artifact`                            |
| GET    | `/artifacts/:id/versions` | —                                                                                                    | `ArtifactVersion[]`                   |
| POST   | `/artifacts/:id/share`    | `{ targetIds: string[] }`                                                                            | `{ url: string; artifact: Artifact }` |
| GET    | `/directory`              | —                                                                                                    | `DirectoryEntry[]`                    |

`/artifacts` lists every Artifact (own, pinned, and shared-to-me), backing the
Artifacts Gallery's filters (All / Yours / Shared to me / Pinned) and sort
(pinned-first / recent / name), which are applied client-side.

Returns the sandboxed-iframe-ready HTML for the Artifact's current content, colored
for the requested theme ([ADR-0001](../adr/0001-artifact-rendered-via-sandboxed-iframe.md)).
The Studio panel additionally `postMessage`s `{ type: 'theme', theme }` into the
already-mounted iframe on every theme change, so an artifact's own script can react
instantly without waiting on a refetch.

`PATCH /artifacts/:id` toggles the Artifact's pinned state from the Gallery card;
the pinned flag is persisted (localStorage-backed mock) and survives reload.

`/artifacts/:id/versions` lists the Artifact's past versions (`n`, `label`,
`createdAt`), newest last. Passing one of those versions' `id` as `?versionId=` on
`/artifacts/:id` re-renders that historical version's content instead of the latest.

`POST /artifacts/:id/share` marks the Artifact as shared (`Artifact.shared` flips to
`true`, persisted) and returns a shareable URL pointing at its full-page view
(`/cowork/artifact/:id`, [ADR-0002](../adr/0002-react-router-despite-state-driven-mockup.md)).
`targetIds` reference `DirectoryEntry.id` values (department code, section code, or
NT account) from `GET /directory`; the mock backend does not model per-recipient
delivery, it only flips the sender's own Artifact to shared. A recipient's "Shared to
me" view is simulated directly via seed data (`Artifact.sharedBy`), not by this
endpoint.

`GET /directory` returns the searchable department / section / person dataset backing
the share dialog's recipient picker (`DirectoryEntry.kind` is `'department'`,
`'section'`, or `'person'`; `label` is the searchable display text — the raw code for
departments/sections, `"<NT account> · <中文名>"` for people).

## Connector

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
|        |      |         |          |

## Schedule

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
|        |      |         |          |

## DC Item

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
|        |      |         |          |

## Upload

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
|        |      |         |          |
