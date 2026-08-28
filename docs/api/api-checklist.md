# API 清單(後端對接核對表)

**前端實際會打的每一條端點**的總表,依 `src/api/*` 與 hooks 逐條盤點。給後端對接用:
「後端實際 input/output」欄留白,請直接填寫或標「同左」。

詳細契約(事件流、欄位語意、降級規則)見 [interface.md](./interface.md);型別定義在
`src/types/api/`(線路型別即應用型別,[ADR-0003](../adr/0003-verbatim-backend-wire-contract.md))。

## 共通約定

- Base path:一律相對路徑 `/api`(寫死於 `api/apiClient.ts`,無環境變數)
- 身分:**每個請求**帶 `X-User-Id` header(`api/apiClient.ts` 的 `getAuthHeaders()`;
  axios interceptor 與 `agentApi` 的 raw fetch 共用同一個 helper,見
  [ADR-0007](../adr/0007-cowork-file-parity-for-api-seams.md))
- 錯誤格式:`{ code: string, message: string }`(`@RestControllerAdvice` 統一)
- 時間戳一律 ISO-8601 UTC 字串(後端 Java `Instant`)
- 前端不呼叫 `POST /sessions`:session id 由前端產生,第一次送訊息／上傳時 upsert
  ([ADR-0005](../adr/0005-new-chat-is-a-client-side-draft.md))

## 1. Config

| #   | Method + Path | 前端送出 | 前端期望回應                                                                 | 狀態    | 後端實際 input/output(請補) |
| --- | ------------- | -------- | ---------------------------------------------------------------------------- | ------- | --------------------------- |
| 1   | `GET /config` | —        | `AppConfig`:`{ retentionDays, maxFiles, maxSessionBytes, singleFileLimits }` | ✅ 已接 |                             |

`singleFileLimits` 的 key 是小寫副檔名、值是位元組上限。前端用它產生上傳的 `accept`
屬性與畫面上的限制說明,不另存一份會漂移的副本。

## 2. Session

| #   | Method + Path             | 前端送出            | 前端期望回應                                                           | 狀態    | 後端實際 input/output(請補) |
| --- | ------------------------- | ------------------- | ---------------------------------------------------------------------- | ------- | --------------------------- |
| 2   | `GET /sessions`           | —                   | `Session[]`                                                            | ✅ 已接 |                             |
| 3   | `GET /sessions/{id}`      | —                   | `SessionDetail`(含 `messages: Message[]`、`files: UploadedFileInfo[]`) | ✅ 已接 |                             |
| 4   | `PATCH /sessions/{id}`    | `{ title: string }` | `Session`                                                              | ✅ 已接 |                             |
| 5   | `POST /sessions/{id}/pin` | —(無 body,切換式)   | `{ id, pinnedAt: string \| null }`                                     | ✅ 已接 |                             |
| 6   | `DELETE /sessions/{id}`   | —                   | 200                                                                    | ✅ 已接 |                             |

Pin 是**切換式**的:方向由後端決定並蓋時間戳,client 不送它可能已經過時的狀態。
`sessionApi.createSession`(`POST /sessions`)保留但沒有呼叫端——mock-only。

## 3. 對話(SSE)

| #   | Method + Path                  | 前端送出                                                                    | 前端期望回應                                                                                         | 狀態    | 後端實際 input/output(請補) |
| --- | ------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------- | --------------------------- |
| 7   | `POST /sessions/{id}/messages` | `{ question: string, baseArtifactId?: string }`,`Accept: text/event-stream` | SSE:`AgentEvent` 流(`STEP`/`TOKEN`/`ANSWER`/`ARTIFACT`/`THINKING`/`QUESTION`/`CODE`/`TABLE`/`ERROR`) | ✅ 已接 |                             |

要點:`ERROR` 事件**不關閉串流**(後端還會送收尾 STEP,連線關閉才算結束);中止靠
client abort,前端會在 abort 後兩段 800ms invalidate 追後端非同步落庫。
`Message.stepsJson` / `questionsJson` 是 JSON 字串(Mongo 文件形狀直出)。

## 4. Session files

| #   | Method + Path                          | 前端送出                                          | 前端期望回應         | 狀態    | 後端實際 input/output(請補) |
| --- | -------------------------------------- | ------------------------------------------------- | -------------------- | ------- | --------------------------- |
| 8   | `POST /sessions/{id}/files`            | multipart,欄位名 `files`(可多檔,axios `FormData`) | `UploadedFileInfo[]` | ✅ 已接 |                             |
| 9   | `DELETE /sessions/{id}/files/{fileId}` | —                                                 | 204                  | ✅ 已接 |                             |

上傳進度來自 axios 的 `onUploadProgress`;瀏覽器自行從磁碟串流 FormData,不需要把整份
檔案讀進記憶體。`UploadedFileInfo.expired = true` 時前端擋送出並顯示保留期警告
(`retentionDays` 來自 #1)。

## 5. Artifact

| #   | Method + Path                    | 前端送出                                             | 前端期望回應                                                | 狀態                    | 後端實際 input/output(請補) |
| --- | -------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------- | --------------------------- |
| 10  | `GET /artifacts`                 | —                                                    | `Artifact[]`(Gallery 清單)                                  | ✅ 已接                 |                             |
| 11  | `GET /artifacts/{id}`            | (選)`?r={nonce}`(Reload cache-buster,nonce > 0 才送) | `text/html`(組裝後的完整文件)                               | ✅ 已接                 |                             |
| 12  | `GET /artifacts/{id}/raw`        | —                                                    | `text/plain`(組裝前原始碼;「查看 HTML」與迭代回餵用)        | ✅ 已接                 |                             |
| 13  | `POST /artifacts/{id}/repair`    | `{ errors: BrowserJsError[] }`                       | `{ repaired: boolean }`;檔案過期時錯誤 code `FILES_EXPIRED` | ✅ 已接                 |                             |
| 14  | `POST /artifacts/{id}/pin`       | —(無 body,方向由後端判定)                            | `Artifact`                                                  | ✅ 已接                 |                             |
| 15  | `POST /artifacts/{id}/publish`   | —                                                    | `Artifact`(`publishedAt` 由後端蓋章)                        | ✅ 已接                 |                             |
| 16  | `DELETE /artifacts/{id}/publish` | —                                                    | `Artifact`                                                  | 📝 合約已定,UI 尚無入口 |                             |
| 17  | `DELETE /artifacts/{id}`         | —                                                    | 200                                                         | ✅ 已接                 |                             |
| 18  | `POST /artifacts/{id}/share`     | `{ targetIds: string[] }`                            | `{ url: string, artifact: Artifact }`                       | ✅ 已接                 |                             |

`GET /artifacts/{id}` **沒有 theme 參數**,Artifact HTML 只有單一配色
([ADR-0001](../adr/0001-artifact-rendered-via-sandboxed-iframe.md))。
`Artifact.type`(`'dashboard' | 'slides'`)尚未回到契約,見
[backend-feedback](./backend-feedback.md) #6。

## 6. Directory(分享收件者)

| #   | Method + Path    | 前端送出 | 前端期望回應                                                                | 狀態                  | 後端實際 input/output(請補) |
| --- | ---------------- | -------- | --------------------------------------------------------------------------- | --------------------- | --------------------------- |
| 19  | `GET /directory` | —        | `DirectoryEntry[]`:`{ id, kind: 'department'\|'section'\|'person', label }` | 🔧 前端 stub 固定資料 |                             |

分享本身已接真後端,只有收件者名單還是 `artifactApi.listDirectory` 回的固定資料。

## 7. Connector

| #   | Method + Path            | 前端送出                      | 前端期望回應                                                                                                  | 狀態                 | 後端實際 input/output(請補) |
| --- | ------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------- |
| 20  | `GET /connectors`        | —                             | `Connector[]`:`{ id, name, description, category, status: 'connected'\|'available'\|'expired'\|'no_access' }` | 🔧 前端常數 + 偏好   |                             |
| 21  | `PATCH /connectors/{id}` | `{ status: ConnectorStatus }` | `Connector`                                                                                                   | 🔧 寫進 localStorage |                             |
| 22  | `POST /connectors`       | `{ name: string }`            | `Connector`                                                                                                   | 🔧 寫進 localStorage |                             |

Connector 目前完全不發請求:目錄是 `connectorApi` 裡的常數,使用者的選擇疊在上面並存
`erd-cowork:connector-prefs`。UI 是可操作的(這與其他 stub 不同)——因為「選了哪些資料
來源」對使用者是真的偏好,只是還沒有帳號層級的歸屬。

## 8. 尚無前端呼叫

- **Schedule**:頁面仍是佔位,無任何端點
- **DC Item**:只作為 QUESTION 表單的欄位選項出現,無獨立端點

## 狀態圖例

- ✅ 已接:前端現在就會打,後端已有實作
- 🔧 前端 stub / 偏好:不發請求,`src/api/` 直接回資料;後端就緒後改回真呼叫
- 📝 合約已定:函式存在但沒有 UI 入口

型別出處速查:`Session`/`SessionDetail` → `types/api/session.ts`、`Message` →
`message.ts`、`AgentEvent`/`TableResult`/`QuestionForm` → `agentEvent.ts`、`Artifact` →
`artifact.ts`、`UploadedFileInfo` → `upload.ts`、`Connector` → `connector.ts`、
`DirectoryEntry` → `directory.ts`、`AppConfig` → `configApi.ts`。
