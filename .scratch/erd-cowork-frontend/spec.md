# eRD Cowork — Frontend (with mock backend)

Status: ready-for-agent

## Problem Statement

RD 製程整合工程師目前要做製程/良率分析（例如追一顆 SPC 異常、確認 CP Test 送測案件進度、每天巡一輪監控指標）時,得手動到好幾個各自獨立的系統(Inline、WAT、CP、Lot Info 等)撈資料,再自己組圖表、自己判斷是否異常。已經有一份 UI/UX 團隊產出、獲得認可的互動設計稿(`eRDWorkspace20260819.html` / `project.png`),描繪一個可以直接用自然語言提問、系統自動回一份分析成果的工作區(eRD Cowork),但目前完全沒有開始開發,後端團隊也還沒有可以對齊的介面規格。

## Solution

開發 eRD Cowork 的 Studio 體驗前端:使用者輸入請求(自由輸入或點擊建議提示)後觸發對應的 Scenario(SPC、Inline dashboard、Daily monitor、CP Test),系統回傳一個 Artifact(一份自帶樣式的完整 HTML dashboard 或投影片),在對話串旁即時渲染。Session、Artifact、Connector、排程狀態都要在重新整理後保留(用 localStorage 模擬持久化),整個系統(含 Artifact 本身)支援 light/dark mode。由於真正的後端還不存在,所有 API 呼叫先用 MSW 搭配有文件、有型別的介面規格 mock 起來,讓後端工程師可以照同一份規格開發正式服務。

## User Stories

### Session 管理

1. As an RD engineer, I want to start a new chat session in eRD Cowork, so that I can begin a new line of analysis without mixing it with previous conversations.
2. As an RD engineer, I want to see a list of my existing sessions in the left rail, so that I can return to a previous analysis.
3. As an RD engineer, I want to pin important sessions to the top of the list, so that I can find frequently-used analyses quickly.
4. As an RD engineer, I want to rename a session, so that I can label it meaningfully instead of relying on the auto-generated title.
5. As an RD engineer, I want to see my recent sessions separated from pinned ones, so that I can distinguish "saved" work from "recent" work.

### 對話與 Scenario 觸發

6. As an RD engineer, I want to type a free-text request (e.g. "分析 inline dashboard"), so that the system matches it to the right Scenario without me needing to know an exact command.
7. As an RD engineer, I want to click a suggested prompt button (Inline dashboard / SPC analysis / Generate slides / Daily monitor (A14) / CP Test status), so that I can trigger a common analysis without typing.
8. As an RD engineer, I want to see a multi-step "AI is working" progress checklist while my request is being processed, so that I understand what the system is doing and trust the result.
9. As an RD engineer, I want to receive a chat reply summarizing the analysis alongside the generated Artifact, so that I get both a narrative and a visual result.

### Artifact 檢視與管理

10. As an RD engineer, I want to see the generated Artifact rendered in the Studio's right panel, so that I can review the analysis without leaving the conversation.
11. As an RD engineer, I want to view an Artifact in a dedicated full-page view with its own URL, so that I can share a direct link to a specific result.
12. As an RD engineer, I want to switch between prior versions of an Artifact, so that I can compare how an analysis has evolved.
13. As an RD engineer, I want to pin an Artifact, so that I can find it quickly in my Artifacts gallery.
14. As an RD engineer, I want the Artifact content to switch between light and dark styling to match my current theme, so that the analysis is comfortable to read regardless of my preference.
15. As an RD engineer, I want to share an Artifact with a colleague via a department/person picker that generates a shareable link, so that others can view my analysis without redoing it.

### Artifacts 總覽

16. As an RD engineer, I want to browse all Artifacts I've generated in a gallery view, so that I can find past analyses without hunting through sessions.
17. As an RD engineer, I want to filter the Artifacts gallery by All / Yours / Shared to me / Pinned, so that I can narrow down to the ones relevant to me.
18. As an RD engineer, I want to sort the Artifacts gallery, so that I can find the most relevant one quickly.

### Schedule 排程

19. As an RD engineer, I want to view a list of my scheduled/recurring analysis jobs, so that I know what's running automatically on my behalf.
20. As an RD engineer, I want to see each scheduled job's cadence, last-run time, and status (Active/Paused), so that I can verify it's behaving as expected.
21. As an RD engineer, I want to pause or resume a scheduled job, so that I can temporarily stop unnecessary automated runs.

### Connectors

22. As an RD engineer, I want to see the list of data connectors (Inline, WAT, CP, Lot Info, Lot Abnormal, Process, Defect, TEM, Recipe, Offline Tool Log) and their status (connected/available/expired/no access), so that I understand what data sources a Scenario can draw from.
23. As an RD engineer, I want to connect or disconnect a data connector, so that I can control what data sources are available to my analyses.

### 檔案附件

24. As an RD engineer, I want to attach files via drag-and-drop or a file picker, so that I can include my own data in an analysis request.
25. As an RD engineer, I want to be warned when I exceed the attachment limit (max 5 files / 5GB total), so that I don't submit an invalid request.

### DC Item 選擇

26. As an RD engineer, I want to search and select DC Items (control-chart parameters like Idsat、Vt (gate CD)、Contact Rs) with their spec limits, so that I can scope an SPC analysis to the parameters I care about.
27. As an RD engineer, I want to add a custom DC Item not in the predefined list, so that I can analyze a parameter the system doesn't already know about.

### 身分

28. As an RD engineer, I want the system to know who I am (a fixed mock identity for now), so that "Yours"/"mine only" filters and the CP Test 送測人 field work correctly.

### 主題與版面

29. As an RD engineer, I want to toggle between light and dark mode, so that I can match my viewing environment/preference.
30. As an RD engineer, I want my theme preference to persist across visits, so that I don't have to re-select it every time I open the app.
31. As an RD engineer, I want to resize the session list and thread panels by dragging, so that I can control how much space each part of the screen takes up.

### 持久化

32. As an RD engineer, I want my sessions, pinned artifacts, connector states, and scheduled jobs to persist after I refresh the page, so that my work isn't lost mid-investigation.

### 後端就緒

33. As a backend engineer, I want a documented, typed API contract (TypeScript DTOs + endpoint reference) for every mocked endpoint, so that I can implement the real service to match what the frontend already expects.

## Implementation Decisions

- **範圍邊界**([ADR-0003](../../docs/adr/0003-scope-limited-to-erd-cowork-app.md)):只做「eRD Cowork」App 內部畫面,不含 Workspace Home 首頁與其他 App 入口。
- **路由**([ADR-0002](../../docs/adr/0002-react-router-despite-state-driven-mockup.md)):React Router,對應 `pages/`:
  - `/cowork` — Studio(Session 列表 + 對話串 + Artifact 面板)
  - `/cowork/artifacts` — Artifacts 總覽(篩選:All/Yours/Shared to me/Pinned;可排序)
  - `/cowork/schedule` — Schedule 排程列表
  - `/cowork/artifact/:artifactId` — 單一 Artifact 全頁檢視
    `pages/` 只組裝,邏輯放對應的 `features/session`、`features/chat`、`features/artifact`、`features/artifacts-gallery`、`features/schedule`、`features/connectors`、`features/file-upload`、`features/dc-item`、`features/theme`。
- **Artifact 渲染**([ADR-0001](../../docs/adr/0001-artifact-rendered-via-sandboxed-iframe.md)):`<iframe sandbox srcDoc={html}>`。主題切換時,主 app 透過 `postMessage` 通知 iframe 目前 theme,由回傳 Artifact 的一方(mock 階段為前端 mock handler)依 `?theme=light|dark` 回傳對應配色的 HTML。
- **Server state**:一律用 TanStack Query,對應 API:sessions、messages(送出訊息 → 取得 progress steps + 最終訊息 + Artifact 參照)、artifacts(含 versions、share)、connectors、schedule、dc-items、uploads(僅登記 metadata,不儲存實體檔案)。**絕對不進 Zustand**,依循 `architecture.md` 鐵律。
- **Client UI state(Zustand)**:僅 theme(persist 到 localStorage,沿用 `architecture.md` 範例的 `useThemeStore`)與 session 內的 UI 狀態(sidebar/panel 寬度、collapse,不 persist)。
- **Mock 身分**:目前登入使用者是一個寫死的常數(非 store,因為執行期不會改變),不做登入畫面。
- **Scenario 比對**:mock handler 內建 regex 關鍵字比對(比照原設計稿邏輯移植),自由輸入文字與建議提示按鈕(按鈕直接帶對應的 `scenarioKey`)都導向同一組 4 套 Scenario:`spc`、`inline`、`daily`、`cptest`。
- **多步驟「AI 執行中」動畫**:mock 回應內含一份固定的 `steps: {key, title, description}[]` 清單(依 Scenario 而異),前端用 client-side timer 依序播放,不做真正的串流(SSE/WebSocket)。
- **Mock backend / MSW**:handler 讀寫 `localStorage` 中的 JSON 作為「資料庫」,讓 session/artifact/connector/schedule/dc-item 狀態在重新整理後仍保留;4 套 Scenario 各自對應一份固定 HTML fixture(light/dark 各一版或以 CSS variable 切換)。
- **API 型別與文件**:`types/api/` 下建立 DTO(`Session`、`Message`、`Scenario`、`Artifact`、`ArtifactVersion`、`Connector`、`ScheduleJob`、`DcItem`、`Upload`),搭配 `docs/api/interface.md` 用表格列出每支 endpoint 的 method/path/request/response 範例,做為後端實作的介面規格來源。
- **i18n**:不導入框架,文字比照設計稿寫死中英混用。

## Testing Decisions

- **Seam(已與使用者確認)**:唯一測試切入點是「網路邊界」。測試整頁 render(包進真實的 `QueryClientProvider`、`RouterProvider`、Zustand store),由 MSW 攔截並回傳 fixture 資料,斷言一律透過 Testing Library 的使用者視角查詢(`getByRole` 等)驗證畫面結果。
- **不做的事**:不 mock TanStack Query hooks、不 mock Zustand store、不 shallow-render 或 mock 子元件——避免測試跟實作細節綁死。
- **工具**:Vitest + React Testing Library + `@testing-library/user-event` + MSW(dev 模式與測試共用同一組 handler,確保行為一致)。
- **受測模組**:上述每個 `features/*` 都透過其對應的 page-level 進入點測試(例如測 `/cowork` 頁面的完整互動流程,而不是單獨測某個 hook)。
- **既有範例**:本專案是全新專案,沒有既有測試可參考;第一批測試會建立後續模組依循的模式。

## Out of Scope

- Workspace Home 首頁(Daily Indicators 釘選卡片、3 格導覽卡片)
- 左側 App 切換 rail 上「eRD Cowork」以外的其他 App(我的最愛、App 分類)
- 真實登入/SSO 流程
- i18n 框架與真正的雙語翻譯內容
- 真實後端串接、真實 AI/LLM 呼叫(全部由 MSW mock)
- 串流(SSE/WebSocket)式逐字回覆效果
- 異常情境版本的 mock 資料(例如多筆 OOC、CP Test 低完成率警示版) — 之後視需要擴充
- 檔案上傳的實體儲存/後端處理(僅前端登記檔名/大小等 metadata)

## Further Notes

- 後端團隊應以 `types/api/*.ts` 與 `docs/api/interface.md` 作為介面規格的單一事實來源;之後接上真實後端時,只要關掉 MSW、實作相同的 API 合約即可,前端呼叫端程式碼不需要更動。
- `CONTEXT.md` 與 `docs/adr/0001~0004` 記錄了這次設計討論的完整背景與詞彙定義,實作與後續 spec/ticket 應延用其中用語(Workspace、Cowork、Studio、Session、Scenario、Artifact、Connector、DC Item 等)。
- 原始設計稿 `eRDWorkspace20260819.html` 與 `project.png`([ADR-0004](../../docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md))是 style、排版、圖示的**必須對齊**來源,不只是參考;不需要(也不應該)讓程式碼結構模仿該檔案內部打包後的產物本身,但畫面呈現(間距、收合行為、圖示選用等)要對齊。圖示一律用 `@ant-design/icons`,不用文字符號或 emoji 頂替。
