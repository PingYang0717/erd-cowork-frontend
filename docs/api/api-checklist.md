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

## 定案紀錄（2026-08-27 逐題問答）

1. **Pin/Publish 回應**：`{ id, pinnedAt | publishedAt }`，un* 動作回 `null`，ISO-8601。
   前端 mutation 只 invalidate、不讀回應 → 相容。
2. **錯誤形狀**：全域 `{ code, message }`；repair 檔案過期回 `FILES_EXPIRED` → 前端零修改。
3. **`GET /artifacts`**：定版 14 欄全回，**另加 `type: 'dashboard' | 'slides'`**。
4. **Session 寫入**：照 artifact 家族——Pin 改 `POST /sessions/{id}/pin` 切換式、
   Rename 維持 `PATCH { title }`、Delete 回 200。
5. **Connector / Directory**：本輪不做，前端維持 stub 與停用。
6. **Share**：與 Directory 綁定，一起緩。
7. **時間戳**：後端一律 Java `Instant` → ISO-8601 UTC 字串，前端直接相容。
8. **身分**：internal 由 SSO/gateway 注入；前端安裝回傳 `{}` 的 identity provider、
   不再送 `X-User-Id`（v1 匿名 UUID 僅限本機開發）。

## 前端待辦（依上面定案）

- [x] `sessionApi`：pin 改 `POST /sessions/{id}/pin`；session Rename/Pin/Delete 全面解禁
      （UnsupportedLabel 已整個移除；後端錯誤以 toast 呈現）
- [x] artifact Delete/Share 解禁（Share 未就緒時由後端錯誤告知）
- [x] Regenerate 按鈕移除（後端無此概念；迭代走對話 `baseArtifactId`）
- [x] Connector 選取改 localStorage 偏好（`erd-cowork:connector-prefs`）
- [x] MSW 測試 handler 跟上新形狀（session PATCH/pin/DELETE、artifact DELETE、share 501）
- [ ] `Artifact` 型別補 `type` 欄位；Gallery 縮圖與 Dash/Deck 標籤接回
- [ ] internal 身分 provider 的安裝開關（不送 `X-User-Id`）

### 狀態圖例

- ✅ 已接：前端現在就會打，後端已有實作（cowork master 的 11 條基準）
- 🚫 UI 停用中：前端 handler 與型別都已就位，等後端端點上線即拿掉 `disabled`
- 🔧 前端 stub：讀取類，`src/api/` 直接回固定資料不發請求；後端就緒後改回真呼叫
- 📝 合約已定：函式存在但沒有 UI 入口

型別出處速查：`Session`/`SessionDetail` → `types/api/session.ts`、`Message` →
`message.ts`、`AgentEvent`/`TableResult`/`QuestionForm` → `agentEvent.ts`、`Artifact` →
`artifact.ts`、`UploadedFileInfo` → `upload.ts`、`Connector` → `connector.ts`、
`DirectoryEntry` → `directory.ts`、`AppConfig` → `configApi.ts`。
