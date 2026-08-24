# 與 `cowork-master` 的功能比對與設計缺口

比對日期：2026-08-25。對象是 `/Users/py/Downloads/cowork-master`（Spring Boot + MongoDB

- FastAPI deepagent，前端 React 18 + antd 6）與本專案（React 19 + Vite，MSW mock backend）。

前提：**兩份前端要接同一個後端**。因此本文的第 2 節先把那個後端**實際**提供的端點列
出來，之後的落差都以它為基準。

---

## 1. 功能面差異

### 只有本專案有

| 功能                   | 說明                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Scenario 模型**      | SPC / Inline dashboard / Daily monitor / CP Test 四套分析劇本，決定反問哪些條件、跑哪段流程、產哪種 Artifact                    |
| **分析條件表單**       | 帶欄位種類（`single`/`multi`/`text`/`boolean`/`daterange`/`dcitem`）、欄位相依（`visibleWhen`）、選項附帶規格上下限的結構化反問 |
| **Connector**          | 10 種資料來源的連線狀態（已連線／可連線／已過期／無權限）、搜尋、分類篩選、自訂新增；並決定分析條件表單上 Data type 的可選項    |
| **DC Item**            | 管制項目清單與自訂新增，帶 `unit` / `lo` / `hi`                                                                                 |
| **Artifacts 總覽**     | 清單、四種篩選（All／Yours／Shared to me／Pinned）、三種排序、縮圖、釘選、刪除、複製連結                                        |
| **分享**               | 分享 dialog + Directory 收件者選擇器（部門／課別／NT 帳號）                                                                     |
| **Artifact 版本**      | 版本清單、版本切換選單、重新生成、「預覽 → 生成」兩段式流程與 coach toast                                                       |
| **全頁 Artifact 檢視** | 獨立路由 `/cowork/artifact/:id`，可直接開啟分享連結                                                                             |
| **深色模式**           | 完整 token 系統，antd 與 CSS Modules 共用同一張表；Artifact iframe 也隨之切換                                                   |
| **Session 管理**       | 建立、命名、釘選、刪除、依時間分組                                                                                              |
| **訊息層級附件**       | 附件掛在送出它的那則訊息上，chip 顯示在該則訊息下                                                                               |
| **Schedule 頁面**      | ⚠️ 僅有路由與 3 行 stub，見第 4 節                                                                                              |

### 只有 `cowork-master` 有

| 功能                               | 說明                                                                                                                                  | 本專案是否該補                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **多使用者身分**                   | 每個請求帶 `X-User-Id`（v1 是 localStorage 匿名 UUID，internal 環境改由 SSO 注入）；所有 session 依 userId 過濾，存取他人資源一律 404 | **必補**——後端強制要求                     |
| **Sample datasets**                | `GET /api/samples` 與「把範例資料集掛進這個 session」，讓沒有自己資料的人能直接試                                                     | 視產品定位；本專案是接廠務資料庫，優先度低 |
| **Session 層級檔案管理**           | 5 檔/session、共 5GB、CSV 單檔 2GB 串流解析、xlsx 200MB；檔案有保留期與過期狀態                                                       | **必補**——後端就是這個模型                 |
| **保留期揭露**                     | `GET /api/config` 回 `retentionDays`，UI 顯示檔案何時過期                                                                             | 建議補                                     |
| **Artifact raw HTML**              | `GET /api/artifacts/{id}/raw` 取回未組裝的 HTML，供迭代修改時回餵前版                                                                 | 迭代功能要用到                             |
| **`baseArtifactId` 迭代**          | 送出時指定「基於這個 Artifact 版本再改」                                                                                              | 型別已支援，**UI 沒有任何地方送出**        |
| **ErrorBoundary / SuspenseLoader** | 整棵樹的錯誤邊界與載入態                                                                                                              | **必補**——本專案完全沒有                   |
| **internal 環境啟動接縫**          | `bootstrap/internal.ts` 以 `import.meta.glob` 讓 internal-only 實作檔可選存在                                                         | 部署到 internal 才需要                     |

### 兩邊都有、但本專案做得更完整

- **串流互動**：兩邊都是 SSE + 九種事件。本專案多了步驟的 ERROR 態視覺與 `aria-label`、
  「eRD AI · stopped」的停止態、耗時、以及斷線與主動中止的區分。
- **反問**：見下一節，本專案的 schema 嚴格更強。

---

## 2. 後端實際提供的端點（基準）

```
GET    /api/config
GET    /api/sessions
GET    /api/sessions/{sessionId}          ← messages 與 files 都包在這裡面
POST   /api/sessions/{sessionId}/messages ← text/event-stream
GET    /api/artifacts/{id}                ← text/html，不是 JSON
GET    /api/artifacts/{id}/raw            ← text/plain
POST   /api/artifacts/{id}/repair
POST   /api/sessions/{sessionId}/files    ← multipart
DELETE /api/sessions/{sessionId}/files/{fileId}
GET    /api/samples
POST   /api/sessions/{sessionId}/files/samples/{sampleName}
```

**就這 11 條。** 沒有 `POST /sessions`、沒有 `PATCH`／`DELETE /sessions/{id}`、
沒有 `GET /sessions/{id}/messages`、沒有 artifact 清單／版本／分享，
沒有 connectors、dc-items、directory、schedule。

---

## 3. 契約落差（同一個後端下，現在接不上的地方）

依嚴重度排序。這些是「即使 live 模式開起來也不會動」的東西。

### 3.1 送出訊息的 body 對不上　🔴 阻斷

後端是 `SendMessageRequest(String question, String baseArtifactId)`。本專案送的是
`{ text, scenarioKey?, artifactKind?, attachments?, answers?, inReplyTo? }`。

- `text` → `question` 只是改名，`liveAdapter` 可以吸收。
- `scenarioKey` / `artifactKind` / `answers` / `inReplyTo` **後端沒有這些概念**。
  Scenario 是本專案的領域模型（[ADR-0006](adr/0006-scenario-drives-clarification.md)），
  後端那邊是「上傳 CSV + 自由 prompt」。

**影響**：live 模式下四套 Scenario 全部退化成一段自由文字，分析條件表單沒有東西可以送回。

### 3.2 QUESTION 事件形狀不同　🔴 阻斷

九種事件裡有八種逐欄一致（這正是事件名維持 SCREAMING_CASE 的用意），QUESTION 不是：

|          | 本專案                                     | 後端                        |
| -------- | ------------------------------------------ | --------------------------- |
| 承載     | `{ form: QuestionForm }`                   | `{ questions: Question[] }` |
| 欄位種類 | 六種                                       | 無                          |
| 欄位相依 | `visibleWhen`                              | 無                          |
| 選項     | `{ value, label, hint?, unit?, lo?, hi? }` | `string`                    |
| 答案回傳 | `{ answers, inReplyTo }` 結構化            | 組成自然語言當新訊息送出    |

`liveAdapter.toQuestionForm()` 能把後端的扁平清單**抬升**成可渲染的表單，但只有這個方向
可行且會失真。**要驅動分析條件表單，後端必須改成送 `QuestionForm` 本身。**

### 3.3 Session 不是 CRUD，是 upsert　🟠 高

後端沒有 `POST /sessions`：session id 由 client 指定，第一次送訊息時 upsert
（`ChatSession` 實作 `Persistable<String>`，見對方 `CLAUDE.md`）。也沒有改名、釘選、刪除。

**影響**：本專案的「New chat」、Session 命名、釘選、刪除四個功能在 live 模式全部無後端。

### 3.4 訊息清單沒有獨立端點　🟠 高

後端把 messages 與 files 包在 `GET /api/sessions/{sessionId}` 裡。本專案的 `useMessages`
打 `GET /sessions/:id/messages` 會 404。

### 3.5 Artifact 內容是 HTML 不是 JSON，且沒有 theme 參數　🟠 高

後端 `GET /api/artifacts/{id}` 直接回 `text/html`。本專案期待 `{ html: string }` 並用
`?theme=light|dark` 取回對應配色的版本。

**影響**：深色模式下的 Artifact 只能靠 `postMessage` 那條路（[ADR-0001](adr/0001-artifact-rendered-via-sandboxed-iframe.md)
已經有），但重新抓取換色的主路徑不存在。

### 3.6 上傳模型不同　🟠 高

後端：`POST /api/sessions/{sessionId}/files`（multipart，session 層級，有刪除、有配額、
有保留期）。本專案：`POST /uploads`（JSON，訊息層級）。

這是 Round 2 Q7 做過的決定（附件維持掛在訊息上），當時的理由仍然成立——本專案的模型
嚴格更強。但**要接同一個後端，就得在 adapter 層把「訊息上的附件」還原成「session 的檔案
清單」**，而且配額與過期狀態必須揭露出來。

### 3.7 身分 header 沒有送　🟠 高

後端每個請求都要 `X-User-Id`，並依它過濾 session、存取他人資源回 404。本專案的
`services/currentUser.ts` 是寫死的 `{ id: 'u-001', name: 'Alex Chen' }`，`apiClient` 的
request interceptor 是空的。

**影響**：live 模式下所有請求都會被當成同一個（或無效的）使用者。

### 3.8 沒有讀 `GET /api/config`　🟡 中

`retentionDays` 之類的公開設定沒有被讀取，所以檔案保留期無法顯示。

---

## 4. 本專案自身的設計缺口（與後端無關）

| 缺口                                | 現況                                                                                                                                | 建議                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Schedule 頁面是 stub**            | `src/pages/Schedule/SchedulePage.tsx` 只有 3 行 `<h1>Schedule</h1>`。`ScheduleJob` 型別存在但全專案零使用處，也沒有對應的 mock 端點 | 補實作，或明確標為未來範圍                                                                    |
| **沒有 ErrorBoundary**              | 任何 render 期例外會白畫面                                                                                                          | **建議優先補**，成本很低                                                                      |
| **身分是寫死的**                    | `currentUser` 是常數，Gallery 的「Yours」篩選靠它                                                                                   | 至少改成 localStorage 匿名 UUID，與後端對齊                                                   |
| **`baseArtifactId` 沒有 UI**        | 契約與型別都支援「基於這個版本再改」，但沒有任何地方送出                                                                            | Artifact 面板加一個「基於此版本繼續問」的入口                                                 |
| **`ScheduleJob.scenario` 語意懸空** | 宣告了但沒有任何地方讀。Scenario 恢復為可執行劇本後語意成立，但沒有實作                                                             | 隨 Schedule 頁面一起處理                                                                      |
| **文案中英混雜**                    | 串流狀態是英文（working / stopped / Took Ns / Connection lost），反問表單是中文（照 mockup）                                        | 這是本次刻意的決定（見 spec 的 Implementation Decisions），但沒有 i18n 框架，之後要統一會很痛 |
| **沒有斷線重連**                    | 斷線只顯示訊息要使用者重送，沒有自動重試或續傳                                                                                      | 後端有 15 秒 heartbeat，可據此偵測                                                            |
| **Artifact 沒有 raw HTML 概念**     | 迭代修改需要回餵前版 raw HTML，本專案沒有這條路                                                                                     | 與 `baseArtifactId` 一起補                                                                    |

---

## 5. 建議的處理順序

**第一階段——讓 live 模式真的能開起來**（都在 `liveAdapter` 與 `apiClient` 層，不動 UI）：

1. `X-User-Id` request interceptor（3.7）
2. `text` → `question` 的 body 轉換（3.1 的可解部分）
3. `GET /sessions/{id}` 拆出 messages（3.4）
4. Artifact 內容從 `text/html` 直接取（3.5）

**第二階段——需要後端配合的**（先送出契約提案，別在前端硬湊）：

5. QUESTION 改送 `QuestionForm`（3.2）——**這是分析條件表單能不能在 live 模式活下來的
   唯一關鍵**
6. `POST /messages` 接受 `answers` / `inReplyTo`（3.1）
7. Session 的建立／改名／釘選／刪除（3.3）

**第三階段——本專案自己的洞**：

8. ErrorBoundary（成本最低、影響最大）
9. 上傳模型對齊 + 配額與保留期揭露（3.6、3.8）
10. Schedule 頁面（第 4 節）
11. `baseArtifactId` 與 raw HTML 的迭代路徑

**不建議做的**：把 Connector、Artifacts 總覽、分享、Artifact 版本這些搬去遷就後端。
它們是本專案相對於 `cowork-master` 的全部領域價值，正確的方向是後端補上，而不是前端砍掉。
