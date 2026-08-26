# eRD Cowork

一個半導體廠務 R&D 平台（eRD Workspace）內的 AI 對話式分析工具，工程師以自然語言請求分析，系統回覆一段可視化的分析成果（Artifact）。

## Language

**Workspace**:
最外層的 R&D 平台外殼，包含左側 App 切換 rail 與 Home 首頁，`eRD Cowork` 是其中一個 App。
_Avoid_: Portal, Platform

**Cowork**:
`eRD Cowork`，Workspace 內以 AI 對話驅動分析的核心 App。
_Avoid_: Chat app, Assistant

**Studio**:
Cowork 內的主要工作畫面，由 Session 列表、對話串（Thread）、Artifact 面板三欄組成。
_Avoid_: Chat view, Main view

**Session**:
一段對話（Thread），底下包含多筆訊息與這段對話中產生的 Artifact 清單；使用者可命名、釘選（pin）。
_Avoid_: Thread, Conversation, Chat

**草稿 Session（Draft session）**:
按下 New chat 後、第一則訊息送出前的 Session。它只存在於這個瀏覽器分頁裡——id 由前端產生，後端在第一則訊息抵達前不知道它存在。草稿可以被放棄（選走別的 Session、或重新整理）而不留下任何痕跡。
_Avoid_: 未儲存的 Session, Pending session（草稿不是「等待儲存」，它是「還沒有理由存在」）

**Scenario**:
使用者請求對應到的一套預先定義分析劇本，目前有四種：SPC、Inline dashboard、Daily monitor、CP Test。一個 Scenario 決定三件事：**要向使用者反問哪些分析條件**、要跑哪一段分析流程、產出哪種 Artifact。
_Avoid_: Workflow, Flow, Intent, Prompt preset（Scenario 不只是一段預寫好的提問——它是可被執行的劇本）

**分析條件（Analysis condition）**:
一次 Scenario 執行前必須先確定的參數，由 Agent 以反問卡向使用者收集，例如 SPC 的 Part ID／Time range／Data type，或 CP Test 的角色／Flow／Loop／時間區間。條件送出後會被組成一句話（`部件：A14；時間區間：近 7 天`）當作使用者訊息留在對話串中——**答案本身不會被保存**，所以歷史裡的反問卡只能顯示當初問了什麼，顯示不出選了什麼。
_Avoid_: Parameter, Setting, Filter

**反問（Question form）**:
Agent 在條件不足時反過來詢問使用者的一張表單，以 QUESTION 事件送達，答案以結構化形式回傳。一次 Scenario 執行中可以反問多次——開場收集分析條件是一次，執行途中發現資料量過大而詢問要先看哪些 DC Item 是另一次。欄位可以互相依賴（例如 CP Test 的 Flow 只在角色為 INT Baseline 時出現）。
_Avoid_: Prompt, Clarification, Dialog

**Agent event**:
一次請求執行過程中由後端逐筆推送的事件，是「AI 正在做什麼」的唯一來源。九種：STEP（步驟狀態）、TOKEN（逐字回覆）、ANSWER（完整回覆）、ARTIFACT（產出的 Artifact）、THINKING（思考過程）、QUESTION（反問表單）、CODE（產碼過程）、TABLE（查詢結果表）、ERROR（錯誤）。
_Avoid_: Message chunk, Delta, Packet

**Thinking**:
Agent 在給出回覆前的推理過程，以 THINKING 事件串流呈現在可摺疊面板中。只存在於當次連線，不進入對話歷史。
_Avoid_: Reasoning, Chain of thought

**修復（Repair）**:
Artifact 的 HTML 在 iframe 中執行時拋出 JS 錯誤後，由系統偵測、向使用者提議、經使用者確認才交由 Agent 重新產生一版可執行 HTML 的流程。
_Avoid_: Fix, Retry, Regenerate（Regenerate 是使用者主動要新版本，Repair 是錯誤驅動）

**重新生成（Regenerate）**:
使用者主動要求 Agent 再產一版 Artifact。它送出一則訊息、跑一整輪分析，結果是**一個新版本**。
_Avoid_: Reload, Refresh（那兩個不產生新版本）

**重新整理（Reload）**:
把 iframe 裡的 Artifact 文件丟掉、以**同一份 HTML** 重新掛載一次。不呼叫 Agent、不產生新版本，用途是讓一個自己卡住的 Artifact 從頭再跑一次它的 script。修復成功後也會觸發一次。
_Avoid_: Regenerate, Repair（三者互斥：Reload 不重產、Regenerate 是使用者要新版本、Repair 是錯誤驅動的重產）

**Artifact**:
一次 Scenario 執行後產生的分析成果，形式是一段完整的 HTML（dashboard 或 slides），在 Studio 右側以 sandboxed iframe 呈現；可被命名、釘選、分享、切版本。
_Avoid_: Dashboard, Report, Output（這些是 Artifact 的呈現型態，不是這個概念本身）

**Artifact version**:
同一個 Artifact 的歷史產出版本，可在版本切換選單中選擇檢視。

**Connector**:
一個資料來源的連線狀態（已連線／可連線／已過期／無權限），例如 Inline、WAT、CP、Lot Info、Lot Abnormal、Process、Defect、TEM、Recipe、Offline Tool Log。連線狀態是帳號層級的事實，跨 Session 共用。Scenario 執行時會參照已連線的 Connector 取得資料，**也決定分析條件表單上 Data type 有哪些可選**。
_Avoid_: Data source, Integration

**DC Item**:
SPC 分析中可選擇的管制項目（量測參數），例如 Idsat、Vt (gate CD)、Contact Rs，各自有上下限（`lo`/`hi`）。當一次 SPC 執行涉及的 DC Item 過多時，Agent 會以 DC item 卡反問使用者先看哪幾項。
_Avoid_: Parameter, Metric

## Semiconductor process language

**Lot**:
一批（batch）晶圓，製程與量測資料的最小追蹤單位。

**Wafer**:
單片晶圓，Lot 底下的個別單位。

**CPK**:
製程能力指數，衡量量測值分布相對於規格上下限的集中與穩定程度。

**OOC (Out of Control)**:
管制圖上超出管制界限（UCL/LCL）或違反 Western Electric rules 的量測點。
_Avoid_: OOS（Out of Spec 是超出「規格」，OOC 是超出「管制界限」，兩者不同，不可混用）

**OOS (Out of Spec)**:
量測值超出產品規格上下限，與 OOC（超出管制界限）是不同的判定基準。

**Western Electric Rules**:
一套套用在管制圖上的統計規則，用來判定資料點是否顯示製程異常（例如連續多點偏向同側）。

**Control chart（管制圖）**:
以 CL（中心線）與 ±3σ 管制界限（UCL/LCL）呈現量測趨勢的圖表，用來監控製程穩定性。

**CP Test (Chip Probe)**:
晶圓層級的電性測試；本系統中「送測案件」指一筆 CP Test 委託，含送測人、站點、進度、狀態等欄位。

**WAT (Wafer Acceptance Test)**:
晶圓允收測試，另一種資料連接器來源類型。

**Inline**:
製程進行中量測的資料來源類型（相對於最終電性測試）。

**EXP (Experiment) Health**:
實驗健康度追蹤，記錄實驗相關參數（如 Idsat、Vt）目前是否符合 spec。

**Approval Center**:
Hold/Release 簽核流程的追蹤清單。

**Daily Monitor**:
一種 Scenario，合併 Approval Center、EXP Health、Inline SPC 三種資料產出單一每日監控 Artifact。
