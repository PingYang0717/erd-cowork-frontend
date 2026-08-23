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

| Method | Path                            | Request                                                                                            | Response                                             |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| GET    | `/sessions/:sessionId/messages` | —                                                                                                  | `Message[]`                                          |
| POST   | `/sessions/:sessionId/messages` | `{ text: string; scenarioKey?: ScenarioKey; artifactKind?: ArtifactKind; attachments?: Upload[] }` | `{ userMessage: Message; aiMessage: Message }` (201) |

`scenarioKey` is optional on the request: suggested-prompt buttons send it explicitly,
while free text is keyword/regex-matched server-side (mock) to one of `spc` / `inline` /
`daily` / `cptest`. The response's `aiMessage` already carries the fully-resolved
`steps` and final `text` — the client is responsible for revealing them progressively
via a local timer (no real streaming). Sending a message also creates the produced
`Artifact` record server-side; `aiMessage.artifactId` references it (`artifactName`
remains as a display-only convenience so the chat bubble doesn't need a join).

`artifactKind` (`'dashboard'` by default) selects the shape of the produced Artifact
rather than the analysis that produces it: the "Generate slides" suggested prompt sends
`scenarioKey: 'spc'` together with `artifactKind: 'slides'`, which replays the SPC
scenario, appends a fifth "Generate slides" step to `aiMessage.steps`, and creates an
Artifact whose `kind` is `slides` and whose name is suffixed `(slides)`. This mirrors
the mockup, where slides are a fifth step appended to the same base step list, not a
Scenario of their own — the four Scenarios in `CONTEXT.md` are unchanged.

`attachments` carries the `Upload` records already registered via `POST /uploads`.
They are stored on the returned `userMessage.attachments` and rendered as chips under
that message, so a file is visibly attached to the message it was sent with; the
composer clears its own chips once the message is sent.

## Artifact

| Method | Path                                          | Request                                                                                              | Response                              |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| GET    | `/artifacts`                                  | —                                                                                                    | `Artifact[]`                          |
| GET    | `/artifacts/:id`                              | `?theme=light\|dark` (defaults to `light`), `?versionId=` (optional, defaults to the latest version) | `{ html: string }`                    |
| PATCH  | `/artifacts/:id`                              | `Partial<Pick<Artifact, 'pinned'>>`                                                                  | `Artifact`                            |
| DELETE | `/artifacts/:id`                              | —                                                                                                    | 204 No Content                        |
| GET    | `/artifacts/:id/versions`                     | —                                                                                                    | `ArtifactVersion[]`                   |
| POST   | `/artifacts/:id/share`                        | `{ targetIds: string[] }`                                                                            | `{ url: string; artifact: Artifact }` |
| POST   | `/artifacts/:id/regenerate`                   | —                                                                                                    | `ArtifactVersion` (201)               |
| POST   | `/artifacts/:id/versions/:versionId/generate` | —                                                                                                    | `ArtifactVersion`                     |
| GET    | `/directory`                                  | —                                                                                                    | `DirectoryEntry[]`                    |

`/artifacts` lists every Artifact (own, pinned, and shared-to-me), backing the
Artifacts Gallery's filters (All / Yours / Shared to me / Pinned) and sort
(pinned-first / recent / name), which are applied client-side.

`Artifact.mine` is derived, not stored: the mock backend keeps an `ownerId` on each
Artifact it holds and resolves `mine` per request against the mock identity in
`services/currentUser.ts`, so the Gallery's "Yours" filter reflects who is signed in
rather than a hard-coded fixture flag. `ownerId` never crosses the wire. (The mock's
localStorage key is `erd-cowork:artifacts:v2`; the earlier key held the pre-`ownerId`
shape and is left alone so an old browser reseeds instead of showing nothing as yours.)

Returns the sandboxed-iframe-ready HTML for the Artifact's current content, colored
for the requested theme ([ADR-0001](../adr/0001-artifact-rendered-via-sandboxed-iframe.md)).
The Studio panel additionally `postMessage`s `{ type: 'theme', theme }` into the
already-mounted iframe on every theme change, so an artifact's own script can react
instantly without waiting on a refetch.

`PATCH /artifacts/:id` toggles the Artifact's pinned state from the Gallery card;
the pinned flag is persisted (localStorage-backed mock) and survives reload.

`DELETE /artifacts/:id` removes the Artifact permanently (Gallery card's
more-actions menu); the mock backend does not cascade-delete its versions or
messages that reference it, since none of those are read once the Artifact
itself is gone.

`/artifacts/:id/versions` lists the Artifact's past versions (`n`, `label`,
`createdAt`, `generated`), newest last. Passing one of those versions' `id` as `?versionId=` on
`/artifacts/:id` re-renders that historical version's content instead of the latest.
Every version renders content of its own: unless a version has hand-authored fixture
content (the seeded `artifact-1-v1` draft does), it is rendered from the Artifact's
scenario and kind with its version number carried into the subtitle, so switching
versions always changes what the iframe shows.

`POST /artifacts/:id/share` marks the Artifact as shared (`Artifact.shared` flips to
`true`, persisted) and returns a shareable URL pointing at its full-page view
(`/cowork/artifact/:id`, [ADR-0002](../adr/0002-react-router-despite-state-driven-mockup.md)).
`targetIds` reference `DirectoryEntry.id` values (department code, section code, or
NT account) from `GET /directory`; the mock backend does not model per-recipient
delivery, it only flips the sender's own Artifact to shared. A recipient's "Shared to
me" view is simulated directly via seed data (`Artifact.sharedBy`), not by this
endpoint.

`POST /artifacts/:id/regenerate` creates a new `ArtifactVersion` (`n` = latest + 1,
`label` = the Artifact's current name, `createdAt` = now) and appends it to
`/artifacts/:id/versions`; the Studio panel's "重新生成" button triggers this and then
clears its local version selection so the switcher and iframe fall back to the newest
version. The new version renders as its own content (see above), so the client
invalidates the whole `['artifacts', id]` key — the version list and the rendered
content — rather than the version list alone.

`ArtifactVersion.generated` is per-version state: a version produced by a Scenario
run or by `regenerate` starts `generated: false` (a preview), and
`POST /artifacts/:id/versions/:versionId/generate` flips that one version to
`generated: true` — the Studio panel's "生成 Artifact" button triggers this and the
"已生成" chip / share gating / version menu's green check all read it. Generating one
version never changes any other version's state. (This deliberately reverses the
earlier "every Artifact reaching the panel is already generated" simplification —
see `.scratch/erd-cowork-design-fidelity/spec.md`. The mock's localStorage key is
`erd-cowork:artifact-versions:v2` so a browser holding the un-flagged shape reseeds.)

`GET /directory` returns the searchable department / section / person dataset backing
the share dialog's recipient picker (`DirectoryEntry.kind` is `'department'`,
`'section'`, or `'person'`; `label` is the searchable display text — the raw code for
departments/sections, `"<NT account> · <中文名>"` for people).

## Connector

| Method | Path              | Request                       | Response          |
| ------ | ----------------- | ----------------------------- | ----------------- |
| GET    | `/connectors`     | —                             | `Connector[]`     |
| PATCH  | `/connectors/:id` | `{ status: ConnectorStatus }` | `Connector`       |
| POST   | `/connectors`     | `{ name: string }`            | `Connector` (201) |

`Connector.status` is one of `connected` / `available` / `expired` / `no_access`.
`PATCH /connectors/:id` connects or disconnects a data source from the Studio
composer's Connectors panel; the new status is persisted (localStorage-backed
mock) and survives reload. `no_access` connectors cannot be toggled (the panel
disables their connect control) — the mock backend does not enforce this
server-side, since only the panel exposes the toggle.

`POST /connectors` backs the panel's "Add a custom data source" input. The id is
slugified from the name (`c_<slug>`); posting a name that slugifies to an existing id
returns that connector with 200 instead of creating a duplicate. Created connectors
are `custom: true`, category `Custom`, and start `connected`.

## Schedule

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
|        |      |         |          |

## DC Item

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
|        |      |         |          |

## Upload

| Method | Path       | Request                                   | Response       |
| ------ | ---------- | ----------------------------------------- | -------------- |
| POST   | `/uploads` | `{ fileName: string; sizeBytes: number }` | `Upload` (201) |

Registers a file attachment's metadata only — no binary content is sent or
stored, per [Out of Scope](../../.scratch/erd-cowork-frontend/spec.md). The
Studio composer's attach-files flow calls this once per file that passes its
client-side count (max 5) / total-size (max 5 GB) validation; rejected files
never reach this endpoint. The `Upload` records it returns are then sent as the
`attachments` of `POST /sessions/:sessionId/messages`, which is what binds a file to
a message.
