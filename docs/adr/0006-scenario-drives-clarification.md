# Scenario 決定要反問哪些分析條件，而不只是一段預寫的提問

Composer 上那五顆情境按鈕（Inline dashboard / SPC analysis / Generate slides / Daily monitor (A14) / CP Test status）目前的行為是：按下去直接送出一段預寫好的文字，後端（mock）比對關鍵字決定跑哪套劇本，然後整段跑完。

設計稿裡它們不是這樣運作的。按下 SPC 或 Inline 之後，對話串裡會長出一張「分析條件」表單——Part ID 多選、Time range chips 加自訂輸入、Data type 多選，**Data type 的可選項來自當下已連線的 Connector**，表單裡還有一個「管理連線」連結直接開 Connectors modal；三項都填齊送出鈕才可按，否則顯示「請先選 part id、time range、data type」。送出後表單收合成「已設定 N 項分析條件」摘要。CP Test 有另一張表單（角色／Flow／Loop／時間區間／只看我送測的），其中 Flow 只在角色為 INT Baseline 時出現、Loop 只在 INT Loop 時出現。這整塊在 `docs/design-diff-eRDWorkspace20260819.md` 被標為優先度「高」的缺失，並在上一輪 feature 被刻意延後（ticket 18 `deliberately deferred`）。

我們決定把 Scenario 的定義往上提，而不是往下降：**一個 Scenario 決定要向使用者反問哪些分析條件、跑哪一段分析流程、產出哪種 Artifact**。實作機制是 QUESTION 事件——Scenario 執行的第一件事不是跑步驟，而是送出一張反問表單。

理由：曾經考慮過把 Scenario 降級成「prompt preset」（只是一段預寫的提問，實際做什麼由 agent 自由決定）。那個方向對一個通用的「拖一份 CSV 給 agent 分析」工具是對的，對這個接在廠務資料庫上的領域工具是錯的——四套劇本各自對應真實的廠務分析需求，各自需要不同的參數，而這些參數的可選值來自系統狀態（已連線的 Connector、DC Item 清單），不是使用者能用自然語言講清楚的東西。降級之後，`Artifact.scenario` 與 `ScheduleJob.scenario` 這兩個欄位也會失去意義（排程一個 preset 定期跑，語意不成立）。

**反問的表單結構是契約，選項值是資料。** QUESTION 事件帶的是欄位定義（`key` / `label` / `kind` / `required` / `visibleWhen`），欄位組成由 Scenario 固定，但 `options` 在執行時才填——Data type 由當下的 Connector 連線狀態算出來。這讓「Connector 與情境按鈕連動」這件事有一個明確的方向：**Connector 狀態決定反問卡上有哪些選項**，而不是按鈕去設定 Connector。Connector 的連線狀態維持帳號層級、跨 Session 共用，因為「已過期」「無權限」是全域事實。

**答案以結構化形式回傳**，不組成自然語言再送一次。設計稿的「已設定 N 項分析條件」摘要本來就是從結構化答案渲染出來的；讓 mock 把自己剛組出來的文字再解析回結構，是憑空製造一個會壞的環節。

**一次 Scenario 執行可以反問多次。** SPC 流程在掃描階段發現 DC Item 數量過多時會第二次反問（DC item 卡：搜尋、自訂新增、「建議先選 3–5 項快速出圖確認」）。執行結束後「補齊全部 N 項」的提議**不屬於反問**——那是 agent 主動提議下一步動作，與 Artifact 錯誤修復的提議卡同類，另行設計，不在此決策範圍內。
