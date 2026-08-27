# eRD Cowork API Interface

This is the single source of truth for the backend's API contract. The
corresponding TypeScript DTOs live in `src/types/api/`.

每張表都有 **後端狀態** 欄,三種值:

| 狀態       | 意思                      | 前端怎麼處理                                               |
| ---------- | ------------------------- | ---------------------------------------------------------- |
| **已實作** | 後端真的有這條            | 正常呼叫                                                   |
| **stub**   | 後端還沒有,但畫面需要資料 | `src/api/` 直接回固定假資料                                |
| **停用**   | 後端還沒有,是一個寫入操作 | UI 上 disabled,標「後端尚未支援」;api 函式保留但沒有呼叫端 |

後兩者的理由與取捨見 [ADR-0009](../adr/0009-no-mock-backend-at-runtime.md)。**照著實作
一條標為 stub 或停用的端點之前先確認需求**——它們是前端先行定義的形狀,不是後端已承諾的
契約。

Each feature ticket appends its own endpoints to the relevant section below as
it implements them.

## 身分

每一個請求都帶 `X-User-Id`。後端依它過濾 session,存取他人資源一律 404。

| 環境     | 誰決定這個值                                                              |
| -------- | ------------------------------------------------------------------------- |
| v1(預設) | 瀏覽器:localStorage 的匿名 UUID(`erd-cowork:user-id`),首次使用時產生      |
| internal | SSO / gateway 在請求經過時注入;前端安裝一個回傳 `{}` 的 provider,不覆蓋它 |

附加的位置只有一處:`api/identity.ts` 的 `getAuthHeaders()`。axios interceptor 與
`agentApi` 的 raw fetch 共用它——串流那條路不經過 axios,漏掉 header 會被當成另一個
使用者(或無效使用者)來回應。

`setAuthHeaderProvider()` 是 internal 環境的接縫;傳 `null` 回到匿名 id。

## Session

| Method | Path            | Request                                         | Response        | 後端狀態 |
| ------ | --------------- | ----------------------------------------------- | --------------- | -------- |
| GET    | `/sessions`     | —                                               | `Session[]`     | 已實作   |
| GET    | `/sessions/:id` | —                                               | `SessionDetail` | 已實作   |
| POST   | `/sessions`     | `{}` (title defaults to `"New analysis"`)       | `Session` (201) | 不會實作 |
| PATCH  | `/sessions/:id` | `Partial<Pick<Session, 'title' \| 'pinnedAt'>>` | `Session`       | 停用     |
| DELETE | `/sessions/:id` | —                                               | 204 No Content  | 停用     |

`GET /sessions/:id` 回 `SessionDetail`：session 的 messages 與 files 內嵌其中——後端
**沒有**獨立的 messages 端點。

`POST /sessions` 標為「不會實作」：session 由 client 指定 id、第一次送訊息時 upsert
（[ADR-0008](../adr/0008-new-chat-is-a-client-side-draft.md)），沒有建立端點這件事是決策
不是缺口。改名／釘選／刪除與 `Session.pinnedAt` 則是前端先定義的形狀，UI 上停用中。

## Message / Chat

| Method | Path                            | Request                                 | Response                           |
| ------ | ------------------------------- | --------------------------------------- | ---------------------------------- |
| POST   | `/sessions/:sessionId/messages` | `{ question: string; baseArtifactId? }` | `text/event-stream`（Agent event） |

送出訊息不再一次回傳算好的結果，而是開啟一條 SSE 串流，逐筆推送 Agent event
（[ADR-0005](../adr/0005-sse-streaming-replaces-batch-reply.md)）。mock 與 live 兩條軌道
都走串流，差別只在 SSE 由 MSW 還是由後端產生。

### 請求 body

Body 與後端的 `SendMessageRequest` 逐字一致（[ADR-0007](../adr/0007-verbatim-backend-wire-contract.md)）：

```
{ question: string; baseArtifactId?: string }
```

`scenarioKey` / `artifactKind` **不在線路上**：後端由 LLM 讀 `question` 推斷，mock 的對應
機制是關鍵字比對（`spc` / `inline` / `daily` / `cptest`；`slides|deck|簡報` 決定產出形態）。
`baseArtifactId` 讓這一輪基於既有的 Artifact 迭代——mock 據此沿用該 Artifact 的
scenario 與 kind，而非重新從文字推斷。

**回覆反問**就是下一則訊息：正在等待反問的 session 收到的任何 `question` 都視為答案。
表單答案由前端組成一段自然語言（`utils/composeAnswerText.ts`，值以選項 label 呈現）當
新訊息送出；結構化的 `{ answers, inReplyTo }` 已不在線路上，列入
[後端回饋清單](./backend-feedback.md)。

### 回應：Agent event 串流

`Content-Type: text/event-stream`，每個事件是一個 `data: {json}` 行後接一個空行；`:` 開頭的
行是心跳，解析時忽略；無法解析的區塊靜默丟棄。事件名稱維持 SCREAMING_CASE，與
`cowork-master` 的線路契約逐字一致，因此不需要轉換層。

| `type`     | 欄位                                                | 說明                                 | 進入對話歷史      |
| ---------- | --------------------------------------------------- | ------------------------------------ | ----------------- |
| `STEP`     | `stepKey`, `title`, `description \| null`, `status` | 步驟狀態，同 `stepKey` 後送覆蓋前送  | 是                |
| `TOKEN`    | `delta`                                             | 逐字回覆                             | 是（合成 `text`） |
| `ANSWER`   | `text`                                              | 完整回覆，收尾用                     | 是                |
| `ARTIFACT` | `artifactId`, `title`                               | 本輪產出的 Artifact                  | 是                |
| `QUESTION` | `questions: Question[]`, `form?: QuestionForm`      | 反問（`form` 為前端-only extension） | 否（live-only）   |
| `THINKING` | `delta`                                             | 推理過程                             | 否                |
| `CODE`     | `delta`                                             | Artifact HTML 產碼過程               | 否                |
| `TABLE`    | `tableId`, `intent`, `columns`, `rows`, `truncated` | 查詢結果表                           | 否                |
| `ERROR`    | `code`, `message`                                   | 執行錯誤                             | 否                |

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

### 目前以 stub 供應或停用的端點

app 執行時不再有 mock 後端（[ADR-0009](../adr/0009-no-mock-backend-at-runtime.md)）。後端
還沒建好的端點分兩類：

| 類別             | 端點                                                                                                                                                     | 前端行為                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **stub**（讀取） | `GET /artifacts`、`GET /connectors`、`GET /directory`                                                                                                    | `src/api/` 直接回固定資料，不發請求 |
| **停用**（寫入） | `PATCH`/`DELETE /sessions/:id`、`PATCH`/`DELETE /artifacts/:id`、`POST /artifacts/:id/share`、`POST /artifacts/:id/generate`、`PATCH`/`POST /connectors` | UI 上 disabled，標「後端尚未支援」  |

MSW 只在**測試**裡跑，服務的正是上表以外、後端真的有的那九條，加上 SSE 劇本。

**沒有建立 session 的端點。** session id 由前端產生，第一次送訊息或上傳檔案時由後端
upsert（[ADR-0008](../adr/0008-new-chat-is-a-client-side-draft.md)）。

**線路型別即應用型別**（[ADR-0007](../adr/0007-verbatim-backend-wire-contract.md)）：
`types/api/` 的形狀與後端 DTO 逐字一致（`sender: 'USER' | 'AI'`、`stepsJson` /
`questionsJson` JSON 字串、`artifactTitle`……），UI 在使用點解析，沒有轉換層。
前端-only 的欄位（`Session.pinnedAt`、`Message.scenario` / `attachments`、QUESTION 的
`form`、`Artifact.generated` / `pinned` / `shared`）在型別上明確標註。真後端不回它們時 UI
各自降級；依賴它們的操作目前一律停用（ADR-0009）。

### QUESTION 事件與反問表單的降級

QUESTION 的線路承載是後端的扁平 `Question[]`（純字串選項、`multiSelect`、無欄位種類與
相依）。mock 額外帶上 `form?: QuestionForm` extension，讓分析條件表單（六種欄位、
`visibleWhen`、DC item 規格上下限）維持運作；真後端只送扁平清單時，
`utils/liftQuestions.ts` 把它抬升成一排 chip 的表單——**單向且失真**。

**要驅動完整的分析條件表單，後端必須改送 `QuestionForm` 本身**；連同結構化
答案 `{ answers, inReplyTo }`，這兩項都在[後端回饋清單](./backend-feedback.md)。

## Artifact

| Method | Path                      | Request                                                       | Response                              | 後端狀態 |
| ------ | ------------------------- | ------------------------------------------------------------- | ------------------------------------- | -------- |
| GET    | `/artifacts`              | —                                                             | `Artifact[]`                          | stub     |
| GET    | `/artifacts/:id`          | `?theme=light\|dark`（前端-only query extension，真後端忽略） | `text/html`（HTML 字串）              | 已實作   |
| GET    | `/artifacts/:id/raw`      | —                                                             | `text/plain`                          | 已實作   |
| POST   | `/artifacts/:id/repair`   | —                                                             | `Artifact`                            | 已實作   |
| PATCH  | `/artifacts/:id`          | `Partial<Pick<Artifact, 'pinned'>>`                           | `Artifact`                            | 停用     |
| DELETE | `/artifacts/:id`          | —                                                             | 204 No Content                        | 停用     |
| POST   | `/artifacts/:id/share`    | `{ targetIds: string[] }`                                     | `{ url: string; artifact: Artifact }` | 停用     |
| POST   | `/artifacts/:id/generate` | —                                                             | `Artifact`（前端-only）               | 停用     |
| GET    | `/directory`              | —                                                             | `DirectoryEntry[]`                    | stub     |

`/artifacts` lists every Artifact (own, pinned, and shared-to-me), backing the
Artifacts Gallery's filters (All / Yours / Shared to me / Pinned) and sort
(pinned-first / recent / name), which are applied client-side.

**版本不是端點，是推導**（cowork master 的模型）：session 裡每一則帶 `artifactId` 的訊息
就是一個版本，依出現順序編號（`utils/deriveArtifactVersions.ts`）；每個版本就是一個獨立的
Artifact。迭代（含「重新生成」按鈕）是送一則帶 `baseArtifactId` 的訊息，新一輪產生的
artifact 落成下一個版本。版本選單切換的是 artifactId；串流中剛產生、歷史還沒 refetch 到的
artifact 以「下一號」併入清單。

`Artifact.generated` 是前端-only 的 per-artifact 狀態（版本即 artifact，所以天生就是
per-version）：Scenario 產生的是未生成的預覽，`POST /artifacts/:id/generate` 把它標為已生成
——「已生成」chip、分享 gating、版本選單綠勾與 rail 徽章計數都讀它。

`Artifact.mine` is derived, not stored: the mock backend keeps an `ownerId` on each
Artifact it holds and resolves `mine` per request against the mock identity in
`config/currentUser.ts`, so the Gallery's "Yours" filter reflects who is signed in
rather than a hard-coded fixture flag. `ownerId` never crosses the wire. (The mock's
localStorage key is `erd-cowork:artifacts:v3` — bumped for the stored `generated`
flag — so an old browser reseeds instead of showing stale state.)

Returns the sandboxed-iframe-ready HTML for the Artifact's current content, colored
for the requested theme ([ADR-0001](../adr/0001-artifact-rendered-via-sandboxed-iframe.md)).
The Studio panel additionally `postMessage`s `{ type: 'theme', theme }` into the
already-mounted iframe on every theme change, so an artifact's own script can react
instantly without waiting on a refetch.

`PATCH /artifacts/:id` toggles the Artifact's pinned state from the Gallery card. 停用中
（ADR-0009）：卡片上的釘選鈕與選單項目 disabled，`Artifact.pinned` 目前只從 stub 資料讀。

`DELETE /artifacts/:id` removes the Artifact permanently (Gallery card's
more-actions menu); the mock backend does not cascade-delete its versions or
messages that reference it, since none of those are read once the Artifact
itself is gone.

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

| Method | Path              | Request                       | Response          | 後端狀態 |
| ------ | ----------------- | ----------------------------- | ----------------- | -------- |
| GET    | `/connectors`     | —                             | `Connector[]`     | stub     |
| PATCH  | `/connectors/:id` | `{ status: ConnectorStatus }` | `Connector`       | 停用     |
| POST   | `/connectors`     | `{ name: string }`            | `Connector` (201) | 停用     |

`Connector.status` is one of `connected` / `available` / `expired` / `no_access`.
`PATCH /connectors/:id` connects or disconnects a data source from the Studio
composer's Connectors panel. 停用中（ADR-0009）：面板是唯讀的狀態呈現，每個 toggle 都
disabled 並標「後端尚未支援」。

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

## Session files（上傳）

| Method | Path                                 | Request              | Response                   | 後端狀態 |
| ------ | ------------------------------------ | -------------------- | -------------------------- | -------- |
| POST   | `/sessions/:sessionId/files`         | multipart（`files`） | `UploadedFileInfo[]` (201) | 已實作   |
| DELETE | `/sessions/:sessionId/files/:fileId` | —                    | 204 No Content             | 已實作   |

檔案掛在 session 上（後端契約），清單內嵌於 `SessionDetail.files`。Composer 的
attach-files 流程先過 client-side 驗證（副檔名白名單、最多 5 檔、總計 5 GB，
`utils/uploadValidation.ts`），通過才上傳；multipart body 由 `api/fileApi.ts` 自組。
送出訊息時 mock 把當下的 session 檔案**快照**到該則 user message 的
`attachments`（前端-only extension，支撐 mockup 的 bubble chips）並清空 session 檔案，
所以 composer 的 chips 列在送出後清空。`UploadedFileInfo.expired`（保留期）已入型別，
對應的警示 UI 尚未實作。
