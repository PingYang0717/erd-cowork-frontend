# eRD Cowork API Interface

This is the single source of truth for the mock backend's API contract. Every
endpoint the frontend calls through `api/apiClient.ts` is mocked by MSW
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

| Method | Path                            | Request         | Response                           |
| ------ | ------------------------------- | --------------- | ---------------------------------- |
| GET    | `/sessions/:sessionId/messages` | —               | `Message[]`                        |
| POST   | `/sessions/:sessionId/messages` | 見下方兩種 body | `text/event-stream`（Agent event） |

送出訊息不再一次回傳算好的結果，而是開啟一條 SSE 串流，逐筆推送 Agent event
（[ADR-0005](../adr/0005-sse-streaming-replaces-batch-reply.md)）。mock 與 live 兩條軌道
都走串流，差別只在 SSE 由 MSW 還是由後端產生。

### 請求 body

**開場提問**（自由文字或 Composer 的情境按鈕）：

```
{ text: string; scenarioKey?: ScenarioKey; artifactKind?: ArtifactKind;
  attachments?: Upload[]; baseArtifactId?: string }
```

`scenarioKey` 是選填：情境按鈕明確帶上，自由文字由後端（mock）以關鍵字／regex 比對到
`spc` / `inline` / `daily` / `cptest` 其中之一。`artifactKind`（預設 `dashboard`）選擇產出
Artifact 的形態而非分析本身：「Generate slides」按鈕帶 `scenarioKey: 'spc'` 與
`artifactKind: 'slides'`，重播 SPC 劇本、追加第五個「Generate slides」步驟，並產生 `kind` 為
`slides`、名稱後綴 `(slides)` 的 Artifact。`baseArtifactId` 讓這一輪基於既有的 Artifact 版本
繼續迭代。`attachments` 是已經透過 `POST /uploads` 註冊的 `Upload` 記錄，存在回傳的
`userMessage.attachments` 上並渲染成該則訊息下方的 chip。

**回覆反問**（反問卡送出）：

```
{ answers: Record<string, string | string[] | boolean>; inReplyTo: string }
```

`inReplyTo` 是帶著該 QUESTION 事件的 AI 訊息 id。答案以結構化形式回傳，**不**組成自然
語言再送一次——對話串上的「已設定 N 項分析條件」摘要由前端從 `answers` 渲染
（[ADR-0006](../adr/0006-scenario-drives-clarification.md)）。

### 回應：Agent event 串流

`Content-Type: text/event-stream`，每個事件是一個 `data: {json}` 行後接一個空行；`:` 開頭的
行是心跳，解析時忽略；無法解析的區塊靜默丟棄。事件名稱維持 SCREAMING_CASE，與
`cowork-master` 的線路契約逐字一致，live 模式因此不需要轉換層。

| `type`     | 欄位                                                | 說明                                | 進入對話歷史      |
| ---------- | --------------------------------------------------- | ----------------------------------- | ----------------- |
| `STEP`     | `stepKey`, `title`, `description \| null`, `status` | 步驟狀態，同 `stepKey` 後送覆蓋前送 | 是                |
| `TOKEN`    | `delta`                                             | 逐字回覆                            | 是（合成 `text`） |
| `ANSWER`   | `text`                                              | 完整回覆，收尾用                    | 是                |
| `ARTIFACT` | `artifactId`, `title`                               | 本輪產出的 Artifact                 | 是                |
| `QUESTION` | `form: QuestionForm`                                | 反問表單                            | 是（含答案）      |
| `THINKING` | `delta`                                             | 推理過程                            | 否                |
| `CODE`     | `delta`                                             | Artifact HTML 產碼過程              | 否                |
| `TABLE`    | `tableId`, `intent`, `columns`, `rows`, `truncated` | 查詢結果表                          | 否                |
| `ERROR`    | `code`, `message`                                   | 執行錯誤                            | 否                |

`StepStatus` 是 `'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR'`。步驟可以失敗——這是相對於
舊批次契約最實質的行為改變（舊契約的步驟由前端用 index 推算，不可能失敗）。

**`ERROR` 事件不關閉串流。** 後端在 ERROR 之後仍會送出收尾的 STEP，串流由連線關閉本身
結束。這一點反直覺但是刻意的，不要「修正」成收到 ERROR 就中斷。

串流**開始前**的失敗走一般 HTTP：非 2xx 加上 JSON body `{ code, message }`。串流**開始後**
的失敗走 ERROR 事件。使用者主動中止走 `AbortSignal`，與非預期斷線在 UI 上區分顯示。

### QuestionForm

```
QuestionForm {
  formKey: string          // 'spc-conditions' | 'cptest-conditions' | 'dc-item-scope'
  title: string            // 「分析條件」/「DC item」
  intro?: string           // 「約 N 個 DC item(約 M 筆),資料量偏大。要先看哪些 DC Item?…」
  fields: QuestionField[]
  submitLabel: string      // 「送出」/「開始分析」/「先產生這 N 項」
  disabledHint: string     // 「請先選 part id、time range、data type」
  summaryLabel: string     // 「已設定 N 項 分析條件」
}

QuestionField {
  key: string
  label: string
  kind: 'single' | 'multi' | 'text' | 'boolean' | 'daterange' | 'dcitem'
  options?: QuestionOption[]
  required: boolean
  placeholder?: string
  hint?: string            // 「可多選,只顯示已連線的來源。」
  allowCustom?: boolean    // Time range 自訂輸入、DC item 自訂新增
  visibleWhen?: { field: string; equals: string }
}

QuestionOption { value: string; label: string; hint?: string; unit?: string; lo?: number; hi?: number }
```

**欄位組成是契約，選項值是資料。** 哪些欄位要問由 Scenario 固定，但 `options` 在執行時才
填：SPC 條件表單的 `Data type` 選項是當下 `status === 'connected'` 的 Connector 名稱（無任何
連線時 fallback `["Inline"]`），DC item 卡的選項來自 DC Item 清單。這是「Connector 與情境按鈕
連動」的實際機制——Connector 狀態決定反問卡上有哪些選項，而不是按鈕去設定 Connector。

`visibleWhen` 表達欄位相依：CP Test 的 `Flow` 只在 `role === 'baseline'` 時顯示、`Loop` 只在
`role === 'loop'` 時顯示。上游欄位值改變時，所有依賴它的下游欄位答案清空。

**一次執行可以反問多次。** SPC 開場問一次分析條件，執行途中發現 DC Item 過多時再問一次。
執行結束後「補齊全部 N 項」的提議不是反問，不走 QUESTION。

### 傳輸模式與 live 端點覆蓋範圍

切換是 build-time 的環境變數，不是 runtime 開關。live 模式可搭配的後端只實作了下表左半，
其餘端點在 live 模式下**仍由 MSW 服務**。

| 端點群                                                       | mock 模式 | live 模式 |
| ------------------------------------------------------------ | --------- | --------- |
| `/sessions`、`/sessions/:id/messages`（SSE）                 | MSW       | 真後端    |
| `/artifacts/:id`（HTML）、`/artifacts/:id/repair`            | MSW       | 真後端    |
| `/uploads`、config                                           | MSW       | 真後端    |
| `/artifacts` 清單、pin、`/artifacts/:id/share`、`/directory` | MSW       | **MSW**   |
| `/artifacts/:id/versions`、`regenerate`、`generate`          | MSW       | **MSW**   |
| `/connectors`、`/schedule-jobs`、DC Item 清單                | MSW       | **MSW**   |

live 模式下後端 DTO 與本專案型別的差異在 `api/liveAdapter.ts` 一次轉換，
UI 與 `types/api/` 不受影響：`sender: 'USER' | 'AI'` → `role: 'user' | 'ai'`、
`stepsJson` / `questionsJson` 的 JSON 字串 → 真陣列（解析失敗時該欄位視為不存在，而不是
讓整則訊息壞掉）、`artifactTitle` → `artifactName`。

### QUESTION 事件是唯一形狀不同的事件

其餘八種事件在兩邊逐欄一致，這正是事件名維持 SCREAMING_CASE 的用意。但 QUESTION 不是：

|                              | 本專案                                                           | 既有後端                     |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------- |
| 承載                         | `{ form: QuestionForm }`                                         | `{ questions: Question[] }`  |
| 欄位種類                     | `single` / `multi` / `text` / `boolean` / `daterange` / `dcitem` | 無（一律選項清單）           |
| 欄位相依                     | `visibleWhen`                                                    | 無                           |
| 選項                         | `{ value, label, hint?, unit?, lo?, hi? }`                       | `string`                     |
| 送出鈕 / 未填提示 / 摘要文案 | 由表單帶                                                         | 無                           |
| 答案回傳                     | `{ answers, inReplyTo }` 結構化                                  | 組成一段自然語言當新訊息送出 |

`toQuestionForm()` 能把後端的扁平清單抬升成可渲染的表單，但**只有這個方向可行且會失真**：
後端表達不了欄位種類（於是全部變成 chip）、欄位相依（於是 CP Test 的 Flow / Loop 無法依
角色顯示）、選項的附帶資訊（於是 DC item 帶不了規格上下限）。

**要驅動分析條件表單，後端必須改成送出 `QuestionForm` 本身。** 在那之前，live 模式下的
反問只能退化成一排 chip，`docs/design-diff-eRDWorkspace20260819.md:17` 描述的那三張表單
在 live 模式下渲染不出來。

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

`Artifact.generated` is likewise derived per request: `true` when any of the
Artifact's versions has been generated (see the per-version `generate` endpoint
below). The session rail's Artifacts badge counts only generated Artifacts, so an
ungenerated preview does not bump the count until its 生成 step.

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
