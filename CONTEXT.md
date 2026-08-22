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

**Scenario**:
使用者請求對應到的一套預先定義分析劇本，目前有四種：SPC、Inline dashboard、Daily monitor、CP Test。決定 AI 回覆時要跑哪一段分析流程與產出哪種 Artifact。
_Avoid_: Workflow, Flow, Intent

**Artifact**:
一次 Scenario 執行後產生的分析成果，形式是一段完整的 HTML（dashboard 或 slides），在 Studio 右側以 sandboxed iframe 呈現；可被命名、釘選、分享、切版本。
_Avoid_: Dashboard, Report, Output（這些是 Artifact 的呈現型態，不是這個概念本身）

**Artifact version**:
同一個 Artifact 的歷史產出版本，可在版本切換選單中選擇檢視。

**Connector**:
一個資料來源的連線狀態（已連線／可連線／已過期／無權限），例如 Inline、WAT、CP、Lot Info、Lot Abnormal、Process、Defect、TEM、Recipe、Offline Tool Log。Scenario 執行時會參照已連線的 Connector 取得資料。
_Avoid_: Data source, Integration

**DC Item**:
SPC 分析中可選擇的管制項目（量測參數），例如 Idsat、Vt (gate CD)、Contact Rs，各自有上下限（`lo`/`hi`）。
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
