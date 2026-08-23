# eRD Cowork — 設計還原與功能補齊(design-diff 修復)

Status: ready-for-agent

## Problem Statement

eRD Cowork 的 Studio 前端已依原始 spec(`.scratch/erd-cowork-frontend/spec.md`)完成 18 張票的開發,但實際拿設計稿 `eRDWorkspace20260819.html` 逐畫面、逐元件比對後(見 `docs/design-diff-eRDWorkspace20260819.md`),發現多處落差:一部分是純視覺/間距/文案的細節沒對齊,讓畫面看起來像「approximation」而非核准過的設計稿本身;一部分是實質的功能缺口(session 多時清單捲不到底、長對話新訊息看不到);還有一部分是開發過程中為了簡化資料模型而刻意拿掉的狀態(Artifact 的「生成/未生成」兩態、per-version 的發佈狀態),導致分享 gating、版本選單等互動跟設計稿的預期行為不同。RD 製程整合工程師在使用這些畫面時,會遇到不一致的視覺回饋、關鍵操作缺少防呆(例如未生成就能分享)、或無法完整使用某些既有元件(rail 捲動、新訊息可見性)。

## Solution

依 `docs/design-diff-eRDWorkspace20260819.md` 的逐項比對結果,與使用者逐題確認「要不要修」及修復方式後(詳見本 ticket 對應的對話紀錄),對確認要修的項目補齊功能、樣式、排版、文案,使其對齊設計稿(依 [ADR-0004](../../docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md) 的強制視覺對齊規則);同時明確排除幾類項目(Schedule 頁面、對話澄清表單、Home 相關功能、i18n 框架等),避免範圍蔓延成新 feature。其中兩項會**推翻**先前 ticket 09/13/14 code review 留下的刻意簡化決定——這是本次使用者明確做出的產品決策,非誤改。

## User Stories

### Artifact 生成與版本狀態

1. As an RD engineer, I want to explicitly choose when an Artifact is generated (rather than it always showing as "already generated"), so that I have a clear preview-then-commit step before treating a result as final.
2. As an RD engineer, I want the Artifacts count and left-rail Artifacts nav entry to highlight, plus a toast to appear, when I generate an Artifact, so that I notice where the result was saved and can jump to it.
3. As an RD engineer, I want the share button disabled with an explanatory tooltip until the current Artifact version has been generated, so that I don't try to share something that doesn't exist yet.
4. As an RD engineer, I want each Artifact version to carry its own generated/published state (not the whole Artifact sharing one flag), so that switching to an older version or regenerating doesn't silently change the state of other versions.
5. As an RD engineer, I want the version-switch menu to show a header ("版本 · 共 N 個,可切換後再生成"), highlight the version I'm currently viewing, and mark published versions, so that I can tell at a glance which version I'm on and which are finalized.

### 全頁 Artifact 檢視

6. As an RD engineer, I want the full-page Artifact view's Back button to return me to wherever I came from (session thread, gallery, or schedule) rather than always going to the Artifacts gallery, so that navigation feels continuous.
7. As an RD engineer, I want to switch Artifact versions, share, refresh, and open-in-new-tab directly from the full-page view's toolbar, so that I don't have to go back to the Studio panel to do these actions.
8. As an RD engineer, I want the full-page view to show a distinct "Shared to me" header (sharer identity + badge) instead of the version-switch pill when I'm viewing an Artifact someone shared with me, so that I understand the context of what I'm looking at.

### Steps 執行紀錄

9. As an RD engineer, I want to see a "Worked through N steps" collapsible summary with each step's title and description after a Scenario finishes running, so that I can review what the system did to produce the result.
10. As an RD engineer, I want the in-progress label to read "eRD AI is working…" and the step list to sit inside a bordered card while running, so that in-progress and completed states are visually distinct.

### Thread 面板

11. As an RD engineer, I want to see a data-source chip (e.g. "Inline DB · N5 line") next to the theme toggle in the thread header, so that I know what data this conversation/Scenario is scoped to.
12. As an RD engineer, I want new messages to auto-scroll into view, so that I don't miss the latest reply in a long conversation.

### Session Rail

13. As an RD engineer, I want the session list to scroll independently of the New chat button and the Schedule/Artifacts nav rows, so that I can reach every session even when the list is longer than one screen.
14. As an RD engineer, I want to see a "Recents" header and a "No recent chats." message even when I have no recent sessions, so that the section doesn't appear to disappear entirely.

### 附件

15. As an RD engineer, I want the attachment picker to reject file types other than .csv/.xlsx/.xls with a clear Chinese error message, so that I don't attach a file the analysis can't consume.

### Artifacts Gallery

16. As an RD engineer, I want Artifacts shared with me multiple times to be de-duplicated by their identity (artifact id), so that the "Shared to me" view doesn't show the same result twice, without accidentally hiding two different Artifacts that happen to share a name.

### 視覺樣式對齊

17. As an RD engineer, I want the selected-session-row background/border, the thread empty-state icon tile, and the left-rail nav row colors to use the mockup's exact color tokens (not an approximated `color-mix`), so that highlighted/selected states read correctly in both light and dark mode.
18. As an RD engineer, I want the New chat button, context chips, filter/sort chips, and Connector status buttons styled per the mockup's measurements and per-state colors (connected/connecting/expired), so that these core controls don't read as unstyled antd defaults.
19. As an RD engineer, I want Gallery cards to visually distinguish dashboard vs. slide Artifacts by thumbnail color, show which session produced them, and display "Shared to me"/"Shared" badges, so that I can tell Artifacts apart at a glance without opening each one.
20. As an RD engineer, I want a consistent custom tooltip (dark background, `br7`, delayed fade-in) across the share/regenerate/open-in-new-tab/version-switch/generated controls, so that hover guidance feels like part of this app rather than the browser's default tooltip.
21. As an RD engineer, I want spacing, radius, and font-weight details across the session rail rows, thread/artifact toolbars, composer, message bubbles, group headers, count badges, and the rename input/session/attachment kebab menus to match the mockup's measurements, so the app doesn't read as a rough approximation of the approved design.
22. As an RD engineer, I want attachment chips to render inside the user's message bubble (above the text, not below it), and the attachment Modal's file rows to show type-colored icons with filename/type/size, so that attachments are visually grouped with the message and legible in the picker.
23. As an RD engineer, I want the Share dialog to show an info card (icon tile, Artifact name, type, generated-state chip) and the generated-chip/share icons to match the mockup's icon choices, so that the dialog communicates what's being shared at a glance.
24. As an RD engineer, I want the global scrollbar styling, font smoothing, and the Share dialog's Modal width to match the mockup, so that even incidental visual details are consistent with the approved design.

### 排版

25. As an RD engineer, I want the session rail and thread panel's default widths to match the mockup (270px / 430px), so that the initial layout matches what was approved, even though I can still resize within the existing min/max range.
26. As an RD engineer, I want the sort menu's currently-selected option to be background-highlighted (not just check-marked), so that I can see my current sort choice at a glance.

### 文案

27. As an RD engineer, I want interface text that currently renders in English (sort labels, gallery empty state, attachment modal copy, attachment validation errors) restored to the mockup's Chinese wording, so that the interface matches the approved design's language without introducing a full i18n system yet.
28. As an RD engineer, I want the Artifact chip in chat to show a "shown right →" hint next to the Artifact name, so that I know the referenced Artifact is rendered in the panel beside the conversation.
29. As an RD engineer, I want the "open in new tab" tooltip to read "在新分頁開啟預覽" (matching the mockup), so that it's clear the new tab shows a preview.

### 後端就緒

30. As a backend engineer, I want the `ArtifactVersion` API contract to carry its own `generated`/`published` fields (moved off the Artifact-level `shared` flag), documented in `docs/api/interface.md` and `types/api/ArtifactVersion.ts`, so that I can implement the real per-version publish flow to match what the frontend now expects.

## Implementation Decisions

- **範圍定位**:本 spec 是 `.scratch/erd-cowork-frontend/spec.md` 之後的延伸修復,依 [ADR-0004](../../docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md) 與 `docs/design-diff-eRDWorkspace20260819.md` 的逐項比對結果執行,不重開一個新 feature 的範圍(不含 Workspace Home、i18n 框架、真實後端串接等原 spec 已列的 Out of Scope)。
- **Artifact 生成/發佈狀態模型變更(推翻 ticket 09/13 的簡化決定)**:`ArtifactVersion` 型別新增 per-version 的生成/發佈狀態欄位,取代原本掛在 Artifact 層級的單一 `shared` flag。Artifact 面板依這個狀態決定顯示主色「生成 Artifact」鈕或「✓ 已生成」chip;分享鈕的 disabled 狀態、版本選單的 published 勾也都改讀 per-version 狀態。此變更明確覆蓋 ticket 09、13 comment 中記錄的「no separate un-generated state」設計決定,需要在 review 時特別註記原因(見 Further Notes)。
- **生成流程的 coach highlight + toast**:目前專案沒有 toast/coach highlight 機制,需新增一個輕量共用元件;生成成功後觸發 Artifacts 計數 +1、左欄 Artifacts nav 列高亮、toast(「前往 Artifacts」/「知道了」二選一)。
- **版本選單元件化**:用自訂選單元件取代直接使用 antd Dropdown,顯示標題行、目前版本高亮、每版時間、published 狀態勾,讀取上一項的 per-version 狀態。
- **全頁 Artifact 檢視工具列**:重用版本選單與分享 gating(前兩項完成後可直接接上);新增「進入來源」概念——導向全頁檢視時記錄使用者是從 Session Thread / Gallery / Schedule 的哪個入口進來,Back 鈕依來源導回,無來源時(例如直接開啟分享連結)退回目前的預設行為;新增「Shared to me」標題列變體,依 Artifact 是否為他人分享決定顯示版本 pill 還是這個變體。
- **共用 Tooltip 元件**:新建輕量 tooltip(深色底、`fs11.5`、`br7`、`shadow-md`、0.35s 延遲淡入),套用到分享/重新生成/開新頁/切換版本/已生成等既有按鈕,取代原生 `title` 屬性。
- **附件驗證**:附件 hook 加副檔名白名單(`.csv`/`.xlsx`/`.xls`)檢查,input 加對應 `accept` 屬性,錯誤訊息用中文。
- **Gallery 去重**:「Shared to me」清單依 artifact id(非名稱)去重,取代 ticket 14 中已被移除的 `dedupeSharedByName`——這次用 id 而非 name 是刻意的技術修正,避免重蹈「同名不同 artifact 被誤刪」的舊問題。
- **文案中文化**:排序選單、Gallery 空狀態、附件 Modal、附件錯誤訊息等處的英文文案改回設計稿的中文用字;不引入 i18n 框架,延續原 spec 的決定(文案寫死)。Artifact chip 的「shown right →」提示是唯一例外,維持英文不中文化。
- **視覺樣式對齊**:依 `docs/design-diff-eRDWorkspace20260819.md` 的「樣式」「排版」表逐項調整既有元件的 CSS token(顏色、間距、圓角、字級、陰影)。以下兩項為刻意例外,不對齊設計稿:Session ⋮ 選單的 Pin icon 保留 pinned 時的實心圖示變化(不照設計稿固定用 outline);收合 rail flyout 的群組標頭保留現有可收合能力(不退回純標籤)。
- **圖示規則**:一律延用 [ADR-0004](../../docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md),圖示只用 `@ant-design/icons` 對應元件,不用文字符號或 emoji 頂替(已生成 chip 的 icon 從 `CheckCircleFilled` 換成 `CheckOutlined` 即依此規則)。
- **刻意維持不變(不算差異、不修)**:分享 Dialog 的開啟時機與 footer 狀態文字(維持現有「選擇→分享→出現連結」流程,優於設計稿一開啟就出現連結的時序)、Copy Link 的連結格式(維持 `window.location.origin` 為基礎的 app route,不採用設計稿的假網域,以確保連結真的能打開)、「+」選單彈出方向(維持 antd 自動翻轉防呆,不寫死向上)。

## Testing Decisions

- **Seam(延用既有定案,不新增)**:`.scratch/erd-cowork-frontend/spec.md` 已定案的網路邊界 seam 繼續適用——測試包進真實 `QueryClientProvider`/`RouterProvider`/Zustand store,由 MSW 攔截並回傳 fixture 資料,斷言一律透過 Testing Library 的使用者視角查詢(`getByRole` 等)驗證畫面結果。
- **不做的事**:不 mock TanStack Query hooks、不 mock Zustand store、不 shallow-render 或 mock 子元件。
- **受測模組**:對應被修改的 `features/artifact`(生成/per-version 狀態、版本選單、全頁檢視、分享 gating)、`features/session`(rail 捲動、Recents 空狀態)、`features/artifacts-gallery`(id 去重)、`features/file-upload`(副檔名驗證)、`features/chat`(Steps 摺疊卡、Thread 自動捲動)——都透過各自的 page-level 進入點測試,而非單獨測 hook。
- **純樣式 token 調整不寫斷言測試**:padding/顏色/圓角/字級等純視覺數值調整,依 ADR-0004 的驗收方式用目視比對設計稿驗收即可,不追加自動化斷言。
- **既有範例**:ticket 09、11、13、14 的 seam test(各自的 `*.test.tsx`)是本次新增測試依循的既有模式,尤其 ticket 11 對 per-version 資料的 seam test 寫法可直接參考,延伸到新增的 generated/published 欄位。

## Out of Scope

- Schedule 排程頁面完整實作——維持 ticket 15「deliberately deferred」狀態,不在本次範圍。
- 對話內澄清表單(SPC/Inline 分析條件表單、DC Item 選擇卡、CP Test 表單)整段——維持 ticket 18「deliberately deferred」狀態,列為獨立 ticket,不在本次範圍。
- Artifact 卡片選單的「釘到 Home」項目——Home 頁面本身依 [ADR-0003](../../docs/adr/0003-scope-limited-to-erd-cowork-app.md) 不在範圍內。
- 分享 Dialog 的開啟時機/footer 文案/按鈕文案改版——維持現有流程。
- Copy Link 連結格式改成設計稿的短網址網域。
- 「+」選單固定向上彈出。
- i18n 框架導入——延續原 spec 決定,文案維持寫死。
- 附件 Modal 的「示範資料集」區塊。
- Home 首頁、真實登入/SSO、真實後端串接、串流回覆等原 spec 已列的 Out of Scope 項目,本次不重複調整。

## Further Notes

- 本 spec 依據 `docs/design-diff-eRDWorkspace20260819.md`(2026-08-23 產出)逐項與使用者確認後整理;逐題問答的完整記錄可回溯查閱本次對話。
- 有兩項會**推翻既有 ticket 記錄的刻意決定**,實作與後續 code review 時務必註記原因,避免被誤判為「未經授權的範圍擴張」而打回:1) ticket 09/13 記載的「no separate un-generated state」簡化,本次刻意改回 per-version 生成狀態(見上方 User Story 1-5、Implementation Decisions 第二項);2) ticket 14 記載的移除 `dedupeSharedByName`,本次刻意改用 id 去重重新引入(見 User Story 16)。
- 完成後建議回頭更新 `docs/design-diff-eRDWorkspace20260819.md`,標記哪些差異已解決、哪些是刻意維持不變(分享 Dialog 流程、Copy Link 格式、「+」選單方向、Session 選單 Pin icon、收合群組標頭),避免下次比對重複討論同樣的項目。
- `CONTEXT.md` 與 `docs/adr/0001~0004` 的詞彙與範圍決定持續適用,本次實作應延用其中用語(Workspace、Cowork、Studio、Session、Scenario、Artifact、Artifact version、Connector、DC Item 等)。
