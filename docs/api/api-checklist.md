# API 清單（後端對接核對表）

日期：2026-08-27。這是**前端實際會打的每一條端點**的總表，依 `src/api/*` 與 hooks 逐條
盤點。給後端對接用：「後端實際 input/output」欄留白，請直接填寫或標「同左」。
詳細契約（事件流、欄位語意、降級規則）見 [interface.md](./interface.md)；型別定義在
`src/types/api/`（線路型別即應用型別，ADR-0007）。

## 共通約定

- Base path：一律相對路徑 `/api`（`VITE_API_BASE_URL` 可覆蓋）
- 身分：**每個請求**帶 `X-User-Id` header（`api/identity.ts`；axios interceptor 與
  raw fetch/XHR 共用同一個 helper）
- 錯誤格式：`{ code: string, message: string }`（`@RestControllerAdvice` 統一）
- 前端不呼叫 `POST /sessions`：session id 由前端產生，第一次送訊息／上傳時 upsert
  （ADR-0008）

## 1. Config

| #   | Method + Path | 前端送出 | 前端期望回應                             | 狀態    | 後端實際 input/output（請補） |
| --- | ------------- | -------- | ---------------------------------------- | ------- | ----------------------------- |
| 1   | `GET /config` | —        | `AppConfig`：`{ retentionDays: number }` | ✅ 已接 |                               |

## 2. Session

| #   | Method + Path           | 前端送出                       | 前端期望回應                                                             | 狀態                      | 後端實際 input/output（請補） |
| --- | ----------------------- | ------------------------------ | ------------------------------------------------------------------------ | ------------------------- | ----------------------------- |
| 2   | `GET /sessions`         | —                              | `Session[]`                                                              | ✅ 已接                   |                               |
| 3   | `GET /sessions/{id}`    | —                              | `SessionDetail`（含 `messages: Message[]`、`files: UploadedFileInfo[]`） | ✅ 已接                   |                               |
| 4   | `PATCH /sessions/{id}`  | `{ title: string }`            | `Session`                                                                | 🚫 UI 停用中（Rename）    |                               |
| 5   | `PATCH /sessions/{id}`  | `{ pinnedAt: string \| null }` | `Session`                                                                | 🚫 UI 停用中（Pin/Unpin） |                               |
| 6   | `DELETE /sessions/{id}` | —                              | 204                                                                      | 🚫 UI 停用中（Delete）    |                               |

`Session.pinnedAt` 目前是前端-only 欄位；#4–#6 的 handler 都已接好，後端就緒後只要
拿掉 `disabled` 即上線。

## 3. 對話（SSE）

| #   | Method + Path                  | 前端送出                                                                     | 前端期望回應                                                                                            | 狀態    | 後端實際 input/output（請補） |
| --- | ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- | ----------------------------- |
| 7   | `POST /sessions/{id}/messages` | `{ question: string, baseArtifactId?: string }`，`Accept: text/event-stream` | SSE：`AgentEvent` 流（`STEP`/`TOKEN`/`ANSWER`/`ARTIFACT`/`THINKING`/`QUESTION`/`CODE`/`TABLE`/`ERROR`） | ✅ 已接 |                               |

要點：`ERROR` 事件**不關閉串流**（後端還會送收尾 STEP，連線關閉才算結束）；中止靠
client abort，前端會在 abort 後兩段 800ms invalidate 追後端非同步落庫。
`Message.stepsJson` / `questionsJson` 是 JSON 字串（Mongo 文件形狀直出）。

## 4. Session files

| #   | Method + Path                          | 前端送出                                                             | 前端期望回應                | 狀態    | 後端實際 input/output（請補） |
| --- | -------------------------------------- | -------------------------------------------------------------------- | --------------------------- | ------- | ----------------------------- |
| 8   | `POST /sessions/{id}/files`            | multipart，欄位名 `files`（可多檔；XHR 自組 body，自帶 auth header） | `UploadedFileInfo[]`（201） | ✅ 已接 |                               |
| 9   | `DELETE /sessions/{id}/files/{fileId}` | —                                                                    | 204                         | ✅ 已接 |                               |

`UploadedFileInfo.expired = true` 時前端擋送出並顯示保留期警告（`retentionDays` 來自 #1）。

## 5. Artifact

| #   | Method + Path                    | 前端送出                                                                 | 前端期望回應                                                 | 狀態                                  | 後端實際 input/output（請補） |
| --- | -------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ----------------------------- |
| 10  | `GET /artifacts`                 | —                                                                        | `Artifact[]`（Gallery 清單）                                 | ✅ 已接                               |                               |
| 11  | `GET /artifacts/{id}`            | （選）`?theme=light\|dark`（真後端可忽略）、`?r={nonce}`（cache-buster） | `text/html`（組裝後的完整文件）                              | ✅ 已接                               |                               |
| 12  | `GET /artifacts/{id}/raw`        | —                                                                        | `text/plain`（組裝前原始碼；「查看 HTML」與迭代回餵用）      | ✅ 已接                               |                               |
| 13  | `POST /artifacts/{id}/repair`    | `{ errors: BrowserJsError[] }`                                           | `{ repaired: boolean }`；檔案過期時錯誤 code `FILES_EXPIRED` | ✅ 已接                               |                               |
| 14  | `POST /artifacts/{id}/pin`       | —（無 body，方向由後端判定）                                             | `Artifact`                                                   | ✅ 已接                               |                               |
| 15  | `POST /artifacts/{id}/publish`   | —                                                                        | `Artifact`（`publishedAt` 由後端蓋章）                       | ✅ 已接                               |                               |
| 16  | `DELETE /artifacts/{id}/publish` | —                                                                        | `Artifact`                                                   | 📝 合約已定，UI 尚無入口（unpublish） |                               |
| 17  | `DELETE /artifacts/{id}`         | —                                                                        | 204                                                          | 🚫 UI 停用中（Delete）                |                               |
| 18  | `POST /artifacts/{id}/share`     | `{ targetIds: string[] }`                                                | `{ url: string, artifact: Artifact }`                        | 🚫 UI 停用中（Share）                 |                               |

## 6. Directory（分享收件者）

| #   | Method + Path    | 前端送出 | 前端期望回應                                                                 | 狀態                  | 後端實際 input/output（請補） |
| --- | ---------------- | -------- | ---------------------------------------------------------------------------- | --------------------- | ----------------------------- |
| 19  | `GET /directory` | —        | `DirectoryEntry[]`：`{ id, kind: 'department'\|'section'\|'person', label }` | 🔧 前端 stub 固定資料 |                               |

## 7. Connector

| #   | Method + Path            | 前端送出                      | 前端期望回應                                                                                                   | 狀態                  | 後端實際 input/output（請補） |
| --- | ------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------- |
| 20  | `GET /connectors`        | —                             | `Connector[]`：`{ id, name, description, category, status: 'connected'\|'available'\|'expired'\|'no_access' }` | 🔧 前端 stub 固定資料 |                               |
| 21  | `PATCH /connectors/{id}` | `{ status: ConnectorStatus }` | `Connector`                                                                                                    | 🚫 UI 停用中          |                               |
| 22  | `POST /connectors`       | `{ name: string }`            | `Connector`                                                                                                    | 🚫 UI 停用中          |                               |

## 8. 尚無前端呼叫（規劃中）

- **Schedule**：頁面仍是 stub，無任何端點
- **DC Item**：目前只作為 QUESTION 表單的欄位選項出現，無獨立端點

---

## 待確認（後端請補這些）

前端 mutation 一律 invalidate 後重抓、不把 mutation 回應寫進快取，所以 pin/publish 回
瘦身版（id＋時間戳）**相容**；delete 回 200 無 body 也沒問題。剩下要定案的：

1. **Pin/publish 回應的確切 JSON**：欄位名是 `pinnedAt` / `publishedAt` 嗎？unpin（再按
   一次 pin）與 unpublish 回 `pinnedAt: null` / `publishedAt: null` 還是別的形狀？
   session 的 pin 也是同一家族嗎？
2. **錯誤 body 是否帶 `code`**：前端兩處依賴 `code` 而非 message——repair 的
   `FILES_EXPIRED` 分支、SSE 開流失敗的錯誤顯示。若 delete 類只回 message 沒關係，
   但全域錯誤形狀請定案（`{ code, message }` 或 `{ message }`）。
3. **`GET /artifacts` 的欄位齊不齊**：定版契約裡的 `sessionTitle`、`ownerDisplay`、
   `canPin`、`canShare`、`isOwn`、`isShared`、`hasPersonalCopy` 都會回嗎？規劃中的
   `type`（dashboard/slides）什麼時候進來？
4. **Session 寫入三條**（#4–#6）：rename/pin 的回應是完整 `Session` 還是也走
   id＋時間戳？pin 的請求形狀用 `PATCH { pinnedAt }` 還是想改成像 artifact 的
   `POST /pin` 切換式？
5. **Connector / Directory**（#19–#22）：`status` 的 enum 值與欄位名是否照
   `types/api/connector.ts` / `directory.ts`？
6. **Share**（#18）：回應的 `url` 是絕對網址嗎？`targetIds` 收部門／課別／個人
   混合 id 可以嗎？
7. **時間戳格式**：全部 ISO-8601 字串（前端 `formatRelativeTime` 直接 `new Date()` 解析）？
8. **internal 環境的身分 header**：仍是 `X-User-Id`，還是 SSO/gateway 換名字？

### 狀態圖例

- ✅ 已接：前端現在就會打，後端已有實作（cowork master 的 11 條基準）
- 🚫 UI 停用中：前端 handler 與型別都已就位，等後端端點上線即拿掉 `disabled`
- 🔧 前端 stub：讀取類，`src/api/` 直接回固定資料不發請求；後端就緒後改回真呼叫
- 📝 合約已定：函式存在但沒有 UI 入口

型別出處速查：`Session`/`SessionDetail` → `types/api/session.ts`、`Message` →
`message.ts`、`AgentEvent`/`TableResult`/`QuestionForm` → `agentEvent.ts`、`Artifact` →
`artifact.ts`、`UploadedFileInfo` → `upload.ts`、`Connector` → `connector.ts`、
`DirectoryEntry` → `directory.ts`、`AppConfig` → `configApi.ts`。
