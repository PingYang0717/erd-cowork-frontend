# 與 `cowork-master` 的功能比對與設計缺口

比對日期：2026-08-25，**第 6 節更新於 2026-08-27**。對象是 `/Users/py/Downloads/cowork-master`（Spring Boot + MongoDB

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

---

## 6. Chat panel 流程比對(UI 層)

比對日期：2026-08-25。前面幾節談的是**契約**落差；這一節談的是同樣接得上串流之後，
兩邊 chat panel 在**畫面流程**上的差異。對照檔案：

|      | 本專案                             | `cowork-master`                                         |
| ---- | ---------------------------------- | ------------------------------------------------------- |
| 容器 | `components/chat/ThreadPanel.tsx`  | `components/chat/ChatPanel.tsx`                         |
| 列表 | `components/chat/MessageList.tsx`  | `components/chat/MessageList.tsx` + `MessageBubble.tsx` |
| 輸入 | `components/chat/ChatComposer.tsx` | `QuickChips.tsx` + `PromptSender.tsx`                   |
| 串流 | `hooks/useAgentStream.ts`          | `hooks/useAgentStream.ts`                               |

### 幾乎一致的部分

`useAgentStream` 的 reducer 骨架兩邊近乎逐行對應：`START` / `EVENT` / `DONE` /
`STOPPED` / `RESET`、`STEP` 依 `stepKey` upsert（同一個 key 是狀態轉移不是新步驟）、
`TOKEN`／`THINKING`／`CODE` 累加、`ARTIFACT`／`ANSWER`／`TABLE` 覆寫，以及
**`ERROR` 事件刻意不結束 run**（後端在 ERROR 之後還會送 finalize 步驟，是串流關閉才算結束）。
`AbortController` 存在 ref、unmount 時 abort、`stop()` 先 dispatch `STOPPED` 再 abort，
兩邊連理由都一樣。Enter 送出／Shift+Enter 換行、「+」選單、串流中送出鈕變停止鈕也一致。

### 流程差異

| #   | 項目                      | `cowork-master`                                                                                                                                    | 本專案                                                                                                                                       |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Quick chips**           | `onPick` → `setPrefill()`，**把字填進輸入框**讓使用者確認／修改後再送                                                                              | 點了**直接送出**，且帶 `scenarioKey` / `artifactKind`（[ADR-0006](adr/0006-scenario-drives-clarification.md)，對方沒有這個概念）             |
| 2   | **樂觀 user bubble**      | `pendingQuestion` 立刻畫出使用者的泡泡，再與 history 尾巴比對去重                                                                                  | **沒有**。整輪跑完並 refetch 之前，使用者剛送的那句話不在畫面上                                                                              |
| 3   | **尾巴重複抑制**          | live 已結束但還在畫面上時，`displayMessages` 砍掉 history 最後一則 AI                                                                              | 改用 `runEndedVisibly`（stopped／error／question）決定 live 留不留；乾淨結束就交棒給 history                                                 |
| 4   | **`reset()`**             | 串流 true→false 時呼叫，但**有 questions 時刻意延後**，讓卡片還能互動                                                                              | **完全沒呼叫**（`ThreadView` 沒解構 `reset`）。stopped／error 的 live 區塊會留到下一次 `send` 才被 `START` 清掉                              |
| 5   | **耗時**                  | 掛在**該輪的 AI 泡泡**上；串流中另有 `timerStartedAt` 即時計時                                                                                     | 整串**底部一行** `Took Xs`，不屬於任何訊息；串流中無即時計時                                                                                 |
| 6   | **反問資料模型**          | `Question[]` 陣列，從 `questionsJson` parse；回答**組成自然語言**當新訊息送出                                                                      | 單一 schema-driven `QuestionForm`（含 `formKey`）；回答送結構化 `{ answers, inReplyTo }`，並以 `AnsweredConditions` 摘要落成訊息             |
| 7   | **Artifact 發布**         | ChatPanel 自己管：`onArtifactChange` + **history fallback**（找最後一則有 `artifactId` 的訊息）+ 從 history 推版本清單（`index+1`）                | zustand `setStreamedArtifactId`，只發布 **live** artifact；fallback 與版本推導在 artifact hooks，不在 chat panel                             |
| 8   | **附件**                  | **session 層級、伺服器保存**：`session.files`、`deleteFile`、footer `FileChips`、header `AttachmentsPopover`；**過期檔會擋住送出**並顯示保留期警告 | **單則訊息、純前端**：`useFileAttachments`，chip 在 composer 內，送出即清；無過期概念                                                        |
| 9   | **中止後的資料同步**      | `AbortError` 後**兩段延遲 invalidate（800ms → 再 800ms）**，追後端非同步 `doOnCancel` 落庫                                                         | 只有 `handleSend` 裡一次 invalidate，沒有補追                                                                                                |
| 10  | **invalidate 範圍／時機** | `['session', id]` **和** `['sessions']`，且在 dispatch `DONE` **之前** await（註解寫明是為了避免 live→history 交棒時閃爍）                         | 只 invalidate `messagesQueryKey(sessionId)`，且在 `DONE` **之後**                                                                            |
| 11  | **自動捲動**              | MessageList 捲自己的容器，依賴 `[messages, live, optimisticUserText, bottomSlot]`，立即                                                            | ThreadPanel 捲 `.body`，**40ms timeout**（對齊 mockup），依賴 `[messages.length, steps.length, liveText]`                                    |
| 12  | **Steps 渲染**            | `@ant-design/x` 的 `ThoughtChain`                                                                                                                  | 手刻 `StepRow` / `StepsRecap` + `@ant-design/icons`（為對齊 mockup，見 [ADR-0004](adr/0004-mockup-visual-fidelity-via-ant-design-icons.md)） |
| 13  | **Header／空狀態**        | 標題 + 副標「Import data, prompt eRD AI…」+ AttachmentsPopover；空狀態一行純文字                                                                   | 標題 + 資料來源 chip + ThemeToggle；空狀態 icon 磚 + 標題 + 副標（對齊 mockup）                                                              |
| 14  | **斷線文案**              | `連線中斷，請重新送出一次`                                                                                                                         | `Connection lost — send it again.`（刻意英文，見第 4 節的文案討論）                                                                          |

### 處理結果（2026-08-27）

**已對齊**：

- **#2 樂觀 user bubble** — 已補（`optimisticUserText`）。
- **#3 尾巴重複抑制** — 交棒問題已由 MessageBubble 合流解決：跑完的那輪與歷史那輪走同一條
  render 路徑，長相一致，所以交棒看不出來，不需要對 history 動刀。
- **#4 `reset()`** — 改以 `<ThreadView key={sessionId}>` 解決。整棵重掛一次清掉 stream
  state、樂觀泡泡、recap 展開狀態與捲動位置；逐項清會漂移。
- **#5 耗時位置** — 已搬進該輪的 AI 泡泡，並補上串流中的即時計時。
- **#9 中止後補追** — 已補（`AbortError` 後兩段 800ms 延遲 invalidate）。
- **#10 invalidate 範圍／時機** — 已補（`['sessions', id]` 與 `['sessions']` 一起，且
  在 `DONE` 之前 await）。
- **#11 自動捲動** — 捲動搬進 `MessageList` 自己的容器，deps 補齊（先前少了樂觀泡泡與
  repair 卡，兩者出現時不會捲）。

**維持現狀**（本專案刻意的設計）：#1 quick chips 直送、#6 schema-driven `QuestionForm`、
#7 artifact 發布走 zustand、#8 訊息層級附件、#12 手刻 StepRow、#13 header／空狀態、
#14 英文文案。

### 這一輪新發現的落差

| #   | 項目                                    | 狀況                                                                                                                                                                                               |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | **`[[table:id]]` 標記未處理**           | 🔴 後端在回覆文字裡夾 `[[table:...]]` 指定表格位置，本專案沒有解析，live 模式會把標記原樣印給使用者。**已補**（`utils/tableMarkers.ts`，行內渲染；沒有標記指定位置的表格接在文字後面而不是消失）。 |
| 16  | **後端持久化的系統紀錄訊息**            | 「回應已中斷…」「已修復儀表板執行錯誤…」會被當成一般 AI 回覆走 markdown 排版。**已補**（`constants/messages.ts` + 泡泡的小灰字分支；比對字串維持中文一字不差）。                                   |
| 17  | **`useArtifactContent` 註解與行為不符** | docstring 宣稱換 theme 時保留舊文件，實際上換 query key 就會清空 `data`，畫面會閃。**已補**（`placeholderData: keepPreviousData`）。                                                               |
| 18  | **`ThreadView` 沒有 `key={sessionId}`** | `ArtifactPanel` 有、thread 沒有，stream state 會跨 session 存活。**已補**。                                                                                                                        |
| 19  | **歷史的「查看 HTML」不存在**           | cowork 的泡泡會 lazy-fetch `/artifacts/{id}/raw`，本專案沒有這條端點也沒有這個分支。**已補**。                                                                                                     |

---

## 7. 操作流程逐段比對（UI 層）

比對日期：2026-08-27，在 `feat/align-interfact` 四顆 commit 之後。第 6 節談的是 chat panel
內部；這一節走完使用者實際會碰到的每一段流程。

每一列標註差異的性質：**刻意**（本專案的設計決定，維持）／**缺口**（該補）／
**bug**（現在就是壞的）。

### 7.1 進入 App

|          | `cowork`                                                                     | 本專案                                                                                     | 性質               |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ |
| 落地狀態 | session 清單非空 → 自動選第一筆；清單為空 → 自動開一個草稿。**打開就能打字** | `selectedSessionId` 起始為 `null`，畫面停在「Select or start a session」，**必須先點一下** | **缺口**           |
| 載入態   | 單一 app 層 `SuspenseLoader` + `ErrorBoundary`                               | 每個 pane 各自 `DataBoundary`（Sessions／Thread／Artifact／Content）                       | 刻意（本專案較細） |

### 7.2 開新對話

兩邊現在一致（ADR-0008）：client 產 id、seed cache、第一則訊息 upsert、重複點是 no-op。
差別只剩本專案的側欄分 Pinned／Recents 兩組、草稿列不提供 `...` 選單。

### 7.3 送出訊息

|                       | `cowork`                                                                               | 本專案                                                                                                             | 性質             |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- |
| **中文輸入法（IME）** | `PromptSender` 以 `compositionstart/end` 記錄組字狀態，組字中按 Enter 只選字**不送出** | `ChatComposer` 的 `onKeyDown` 只看 `e.key === 'Enter' && !e.shiftKey`，**組字中按 Enter 會把未完成的候選字送出去** | 🔴 **bug**       |
| Quick chips           | `onPick` → 填進輸入框，使用者確認後再送                                                | 點了直接送出                                                                                                       | 刻意（ADR-0006） |
| 輸入框                | 原生 `textarea`，`max-h-24`                                                            | antd `Input.TextArea`，`autoSize` 1–5 行                                                                           | 刻意             |
| 送出／停止            | 串流中送出鈕換成灰色停止方塊                                                           | 同                                                                                                                 | 一致             |
| 送出後                | 樂觀 user 泡泡 + 尾巴去重                                                              | 同                                                                                                                 | 一致             |

`textarea` 那個 `max-h-24`（96px）在對方是硬上限，本專案的 `autoSize` 到 5 行才停，長 prompt
的體感較好。

### 7.4 檔案

|              | `cowork`                                                                                 | 本專案                                                                   | 性質                       |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------- |
| 模型         | session 層級、伺服器保存                                                                 | 同（`POST /sessions/{id}/files`，經 `SessionDetail.files`）              | 一致                       |
| 入口         | header 的 `AttachmentsPopover`（顯示 `N/5 · 總大小`）+ composer 的「+」                  | 只有 composer 的「+」                                                    | 缺口（小）                 |
| 上傳進度     | `Progress` 百分比條                                                                      | **沒有進度顯示**，大檔上傳期間畫面無回饋                                 | **缺口**                   |
| 保留期／過期 | `GET /api/config` 取 `retentionDays`；過期檔標「已過期」、**擋住送出**並顯示琥珀色警告條 | `UploadedFileInfo.expired` 型別裡有，**UI 一行都沒讀**；也沒讀 `/config` | **缺口**                   |
| 範例資料集   | `SampleDatasetPicker`，沒有自己資料的人能直接試                                          | 無                                                                       | 刻意（本專案接廠務資料庫） |
| Connectors   | 無                                                                                       | 10 種資料來源的連線面板                                                  | 刻意（本專案領域價值）     |

過期檔那條在 live 模式會是實際故障：後端清掉檔案之後，使用者會一直送出一個註定失敗的請求，
而畫面上沒有任何線索。

### 7.5 反問與回答

|          | `cowork`                      | 本專案                                                              | 性質 |
| -------- | ----------------------------- | ------------------------------------------------------------------- | ---- |
| 資料模型 | 扁平 `Question[]`，選項是字串 | schema-driven `QuestionForm`（六種欄位、`visibleWhen`、規格上下限） | 刻意 |
| 出現時機 | 串流結束後才顯示              | **一收到就顯示**（run 正在等使用者，等串流關閉是白等）              | 刻意 |
| 答完之後 | 卡片留在原地變 disabled       | 卡片消失，答案以一句話成為 user 泡泡                                | 刻意 |
| 歷史     | disabled 卡片                 | 同（本輪補上，從 `questionsJson` lift）                             | 一致 |

### 7.6 一輪 run 的呈現

本輪合流後兩邊結構已經一致（灰底泡泡、steps 在泡泡內、耗時掛在該輪、即時計時）。剩下的差異：

|            | `cowork`                           | 本專案                                                  | 性質                    |
| ---------- | ---------------------------------- | ------------------------------------------------------- | ----------------------- |
| Steps 元件 | `@ant-design/x` 的 `ThoughtChain`  | 手刻 `StepRow` / `StepsRecap`                           | 刻意（ADR-0004）        |
| Thinking   | 泡泡頂端「Working on it…」可點開   | 獨立的 `Thinking` 摺疊面板                              | 刻意                    |
| 錯誤呈現   | antd `message.error` toast（8 處） | 全部 inline（`role="alert"` 在泡泡內），**零 toast**    | 刻意（inline 不會錯過） |
| 步驟展開   | 依 `streaming`                     | 依「turn 是否還在進行」（串流中／被停止／等待未答反問） | 刻意（本專案較準）      |

### 7.7 Artifact

|                        | `cowork`                                                             | 本專案                                                      | 性質             |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------- |
| 版本切換               | antd `Select`，`v3 · Latest`                                         | 手刻 `VersionSwitcher`（340px 選單、相對時間、已生成綠勾）  | 刻意             |
| 重新整理（Reload）     | 有，**串流中 disabled**（避免生成到一半重載）                        | 有，**沒有 disabled**                                       | **缺口**（小）   |
| 重新生成               | 無此概念                                                             | 有（送訊息迭代）                                            | 刻意             |
| 生成 Artifact          | 無                                                                   | 「預覽 → 生成」兩段式 + coach toast                         | 刻意             |
| 分享                   | 無                                                                   | 分享 dialog + Directory 收件者                              | 刻意             |
| Dashboard／Slides 切換 | `Segmented`（Slides 永遠 disabled）                                  | 無此切換；slides 是另一個 Artifact                          | 刻意             |
| 全螢幕                 | `window.open('/?artifactView=<id>')`，query param 分流的殼頁         | 路由 `/cowork/artifact/:id`，帶 VersionSwitcher／分享／返回 | 刻意（ADR-0002） |
| CSP                    | `injectCspMeta()` 注入 `<meta http-equiv="Content-Security-Policy">` | **沒有注入 CSP**                                            | **缺口**         |

CSP 那條值得單獨說：兩邊都用 `sandbox="allow-scripts"` + `srcdoc`（opaque origin），本專案
少了對方那層 `default-src 'none'; connect-src 'none'`。sandbox 已經擋掉同源存取，但沒有
`connect-src 'none'` 的話，一段惡意或有 bug 的 Artifact HTML 仍可以對外發網路請求。

### 7.8 修復（Repair）

流程兩邊相同（iframe 回報錯誤 → 卡片提議 → 使用者確認 → 呼叫 `/repair` → 重載）。差異：

- 對方成功後跳 `message.success('已修復，儀表板已重新載入')`；本專案靠 iframe 重掛本身傳達。
- 對方特別處理 `FILES_EXPIRED` 錯誤碼（檔案過期時直接關掉卡片並提示）；本專案一律歸到
  `failed`。這是 7.4 那個保留期缺口的延伸。

### 7.9 Session 管理

|                  | `cowork`                    | 本專案                                            |
| ---------------- | --------------------------- | ------------------------------------------------- |
| 清單             | 單一列表，`dayjs.fromNow()` | Pinned／Recents 兩組、可摺疊、相對時間            |
| 改名／釘選／刪除 | 無                          | 有（live 模式會 404，見 `docs/api/interface.md`） |
| 側欄收合         | 收合後整條消失，只留展開鈕  | 收合成 icon rail，hover 出 flyout                 |

### 7.10 導覽與版面

本專案多出：路由（`react-router`）、Artifacts 總覽頁（四種篩選、三種排序、縮圖、釘選、
刪除、複製連結）、Schedule 頁（**仍是 3 行 stub**）、三欄可拖曳寬度、深色模式。
`cowork` 是單頁、無路由、無深色模式。

### 7.11 建議處理順序

1. 🔴 **IME 組字中按 Enter 會送出未完成的字**（7.3）——使用者是中文輸入的工程師，這是每天都會踩到的。成本：一個 ref + 兩個 handler。
2. **檔案保留期與過期狀態沒有揭露**（7.4）——live 模式的實際故障，且連動 7.8 的 `FILES_EXPIRED`。
3. **落地就要能打字**（7.1）——清單非空選第一筆、清單為空自動開草稿。成本極低，體感差很多。
4. **Artifact iframe 補 CSP meta**（7.7）——安全性，成本是一個 util。
5. **上傳進度**（7.4）與 **串流中禁用 Reload**（7.7）——兩個小缺口。

不建議做的，仍與第 5 節相同：Connector、Artifacts 總覽、分享、版本、深色模式、Schedule 都是
本專案相對 `cowork` 的領域價值，方向是後端補上，不是前端砍掉。
