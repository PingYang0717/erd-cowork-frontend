# eRD Cowork — Agent 串流對話與分析條件反問

## Problem Statement

對話流程目前是假的。`POST /sessions/:sessionId/messages` 一次回傳算好的 `{ userMessage, aiMessage }`，前端用 500ms 的計時器把步驟逐一揭露。這個契約在結構上表達不了三件事：執行途中向使用者反問、逐字回覆與思考過程、使用者中止。

同時，設計稿裡「對話內澄清表單」整段未實作（`docs/design-diff-eRDWorkspace20260819.md` 標為優先度「高」，ticket 18 `deliberately deferred`）：按下 SPC / Inline 情境按鈕後應該先長出一張「分析條件」表單，Data type 的可選項來自當下已連線的 Connector；CP Test 有另一張含條件顯示的表單；SPC 執行途中資料量過大時還會第二次反問要先看哪些 DC Item。`src/types/api/dcItem.ts` 有型別但全專案零使用處，等的就是這個。

另一個實作同一產品的 repo（`cowork-master`，含 Spring Boot + Mongo + FastAPI deepagent 後端）已經有完整的 SSE 串流對話實作，正好提供這兩件事所缺的機制。

## Solution

把 `cowork-master/frontend` 的串流純邏輯移植進來（SSE 解析器、AgentEvent 型別、串流 reducer），UI 全部依本專案的 `features/` 分層與已定版的視覺重寫，並在其上實作設計稿的分析條件反問。

對話端點改為 SSE（[ADR-0005](../../docs/adr/0005-sse-streaming-replaces-batch-reply.md)），mock 與 live 兩條軌道都走串流，差別只在 SSE 從 MSW 還是從後端來。Scenario 的定義往上提為「決定要反問哪些分析條件、跑哪段流程、產哪種 Artifact」（[ADR-0006](../../docs/adr/0006-scenario-drives-clarification.md)）。

## User Stories

### 串流對話

- 送出訊息後，步驟卡即時反映後端推送的 STEP 事件狀態（pending / running / success / **error**），不再由前端用計時器推算
- AI 回覆逐字出現（TOKEN），完整回覆以 ANSWER 收尾
- 執行期間可按「停止」中止；中止後對話串保留已產生的內容
- 連線意外中斷時顯示「連線中斷，請重新送出一次」，與使用者主動中止區分
- 一次執行結束後顯示本輪耗時
- Agent 的思考過程（THINKING）顯示在可摺疊面板中，不進入對話歷史
- AI 回覆以 Markdown 渲染（清單、粗體、表格、程式碼區塊）

### 分析條件反問

- 按下 SPC analysis / Inline dashboard，對話串長出「分析條件」表單：Part ID（多選＋搜尋／貼上）、Time range（`Last 24h` / `Last 7 days` / `Last 30 days` / `Last quarter` 單選＋自訂輸入）、Data type（多選，選項＝當下已連線的 Connector，無連線時 fallback `Inline`）
- Data type 欄位下方顯示「可多選，只顯示已連線的來源。」與「管理連線」連結，點擊直接開 Connectors modal
- 三項未填齊時送出鈕 disabled，旁邊顯示「請先選 part id、time range、data type」
- 送出後表單收合成「已設定 N 項分析條件」摘要，可展開檢視，留在對話串中
- 按下 CP Test status，長出 CP Test 表單：你的角色（`INT Baseline` 看整段 flow／`INT Loop` 看自己的 loop／`其他` 自行輸入，單選）、Flow（僅角色＝INT Baseline 時顯示：整段 flow (全流程) / FEOL / MEOL / BEOL）、Loop（僅角色＝INT Loop 時顯示：FIN / Gate (GT) / POV / Contact (CT) / M1 / Via1 (V1)）、自行輸入範圍（僅角色＝其他時顯示）、時間區間（近 7 天／近 30 天／本季 (Q3)）、檢視（「只看我送測的」開關），送出鈕文案「開始分析」
- 切換角色時清空 Flow / Loop / 自行輸入的既有答案
- SPC 執行途中，掃描階段發現 DC Item 數量過多時第二次反問：DC item 卡（搜尋、自訂新增、「建議先選 3–5 項快速出圖確認」提示），送出鈕文案「先產生這 N 項」，未選時顯示「至少選一項」

### 產碼、結果表與修復

- Artifact 產生過程中的 HTML 產碼（CODE）顯示在可摺疊面板，不進入對話歷史
- 查詢結果表（TABLE）顯示在對話串中，不進入對話歷史
- Artifact 在 iframe 中拋出 JS 錯誤時，對話串底部出現修復提議卡（錯誤數量、第一則錯誤訊息、修復／忽略）；修復中顯示 loading，失敗可再試一次
- 修復成功後 Artifact 面板重載新版本

### 雙軌

- build-time 環境變數決定 mock 或 live 傳輸；mock 模式下上述所有互動（含中止、斷線、修復）都演得出來
- live 模式下 Artifacts 總覽、Schedule、Connectors、Directory、Artifact 版本清單仍由 MSW 服務

## Implementation Decisions

- **只移植純邏輯，UI 重寫。** `sseParser.ts`（含測試）、`useAgentStream` 的 reducer、AgentEvent 型別原樣搬；`MessageBubble.tsx` / `ChatPanel.tsx` 等 UI 綁死了對方的元件樹與 antd `App.useApp()`，重寫進 `features/thread/`
- **不引入 `@ant-design/x`。** 對方唯一用到它的是 `StepChain.tsx`，本專案已有自己的步驟卡
- **引入 `react-markdown` + `remark-gfm`**（AI 回覆的 Markdown 渲染）
- **`agentApi` 走 raw `fetch`**，不經 `services/apiClient.ts`（axios 不吐串流）；`VITE_API_BASE_URL` 需在 `agentApi` 內自行接上
- **事件名稱維持 SCREAMING_CASE**，不套用本專案的 TS 命名慣例
- **串流狀態留在 `ThreadPanel` 的 `useReducer`**；只有跨欄需要的 `activeArtifactId` / `isStreaming` / `runtimeErrors` 進 Zustand。串流中的 token 與 thinking 是尚未成為 API 資料的過渡態，不屬於 TanStack Query 的轄區（AGENTS.md 鐵律 1）
- **持久化邊界**：STEP / ANSWER / ARTIFACT / QUESTION（含答案）存入對話歷史；THINKING / CODE / TABLE / ERROR 只存在於當次連線
- **欄位形狀用本專案的**（真陣列，非 `stepsJson` / `questionsJson` 這類 JSON 字串），live 模式在 `agentApi` 層做一次 adapter 轉換
- **附件維持掛在訊息上**（`Message.attachments`），不改成對方的 session-level 檔案清單
- **Connector 維持全域**、跨 Session 共用
- **`MessageStep` 與移植進來的 `StepItem` 合併成一個型別**（`stepKey` / `title` / `description` / `status`）。步驟狀態改由後端明講，因此新增 ERROR 態的視覺
- **反問表單的文案照 mockup 用中文**（「已設定 N 項 分析條件」「請先選 part id、time range、data type」「先產生這 N 項」「至少選一項」），即使 ThreadPanel 其餘字串是英文。理由：[ADR-0004](../../docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md) 明訂文案與視覺對齊設計稿，而這批表單是廠務工程師實際操作的介面。串流狀態的文案（working / stopped / 斷線 / 耗時）維持英文，因為那是既有 ThreadPanel 表面的延伸，mockup 裡沒有對應設計
- **mock 的 artifact HTML 注入錯誤收集腳本**（移植 `cowork-master` 的 `head-inject.vm`），並提供一個故意壞掉的 artifact fixture，讓修復流程在 mock 下完整演出

## Testing Decisions

- 測試以可控串流驅動：mock handler 提供 `pushAgentEvent(event)` / `closeAgentStream()`，由測試決定何時吐下一個事件。不使用 fake timers——`500ms` 是已經不存在的實作細節
- 串流 UI 的價值在中間態，每個中間態都要有斷言：thinking 展開中、第 N 步 running、按下停止的瞬間、斷線、反問卡待填與填齊
- 現有 4 支受影響的測試（`chat` / `file-attachments` / `generate-coach` / `connectors`）改寫，保留原本的測試意圖

## Out of Scope

- **執行結束後「補齊全部 N 項 DC item」的提議與第二輪執行**——那不是反問，是 agent 主動提議下一步動作，與修復提議卡同類，另行設計
- **`ScheduleJob.scenario` 的實際行為**：`SchedulePage.tsx` 目前完全不讀這個欄位，本次不動
- **`cowork-master` 的輸入模型**（上傳 CSV/Excel 為主線、session-level 檔案、無 Connector 概念）——只照它的串流互動骨架，輸入端維持本專案的 Connector + per-message 附件
- **Workspace 外殼**（[ADR-0003](../../docs/adr/0003-scope-limited-to-erd-cowork-app.md) 持續適用）

## Further Notes

- `CONTEXT.md` 的 `Scenario` 詞條已改寫，並新增「分析條件」「反問」「Agent event」「Thinking」「修復」五條；`Connector` 與 `DC Item` 兩條補上與反問卡的關係
- ticket `.scratch/erd-cowork-frontend/issues/18-dc-item-picker.md` 被本 feature 吸收（issue 09），該檔案應標記為 superseded
- 設計稿的權威來源是 repo 根目錄的 `eRDWorkspace20260819.html`（未壓縮版，86,678 行）。`/Users/py/Downloads/eRDWorkspace20260819.html` 是同一個 app 的 minified bundle，不適合閱讀
- 分析條件表單的原始定義在 `eRDWorkspace20260819.html:82887-83010`（SPC/Inline）、`:83052-83180`（CP Test）、`:83224-83480`（DC item 卡）；選項陣列在 `:9315`（Time range）與 `:9561-9571`（CP Test 角色／Flow／Loop／時間區間）
