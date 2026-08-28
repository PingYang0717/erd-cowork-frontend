# 0004. Scenario 決定要反問哪些分析條件

日期:2026-08-28

## 背景

Composer 上有五顆情境按鈕(Inline dashboard / SPC analysis / Generate slides /
Daily monitor (A14) / CP Test status)。最直觀的做法是:按下去送出一段預寫好的文字,
後端比對關鍵字決定跑哪套劇本,然後整段跑完——也就是把 Scenario 當成 prompt preset。

但四套劇本各自對應真實的廠務分析需求,各自需要不同的參數,而這些參數的可選值來自
系統狀態(已連線的 Connector、DC Item 清單),不是使用者能用自然語言講清楚的東西。

## 決策

**把 Scenario 的定義往上提:一個 Scenario 決定要向使用者反問哪些分析條件、跑哪一段
分析流程、產出哪種 Artifact。** 實作機制是 QUESTION 事件——Scenario 執行的第一件事
不是跑步驟,而是送出一張反問表單。

降級成 prompt preset 的方向對「拖一份 CSV 給 agent 分析」的通用工具是對的,對這個接在
廠務資料庫上的領域工具是錯的;而且降級之後,`Artifact.scenario` 與
`ScheduleJob.scenario` 這兩個欄位會失去意義(排程一個 preset 定期跑,語意不成立)。

**反問的表單結構是契約,選項值是資料。** QUESTION 事件帶的是欄位定義(`key` / `label` /
`kind` / `required` / `visibleWhen`),欄位組成由 Scenario 固定,但 `options` 在執行時
才填——Data type 由當下的 Connector 連線狀態算出來。這讓「Connector 與情境按鈕連動」
有一個明確的方向:**Connector 狀態決定反問卡上有哪些選項**,而不是按鈕去設定 Connector。

**一次 Scenario 執行可以反問多次。** SPC 流程在掃描階段發現 DC Item 數量過多時會第二次
反問(DC item 卡:搜尋、自訂新增、「建議先選 3–5 項快速出圖確認」)。欄位可以互相依賴
——CP Test 的 Flow 只在角色為 INT Baseline 時出現、Loop 只在 INT Loop 時出現。

執行結束後「補齊全部 N 項」的提議**不屬於反問**——那是 agent 主動提議下一步動作,與
Artifact 錯誤修復的提議卡同類,不在此決策範圍內。

## 後果

- 答案在線路上是自然語言(見 [ADR-0003](0003-verbatim-backend-wire-contract.md) 決策 3);
  富表單是 mock-only 的 extension,真後端只吃扁平的 `Question[]`,`utils/liftQuestions.ts`
  做單向抬升。這是目前最大的一項後端回饋。
- Connector 的連線狀態需要跨 Session 共用(「已過期」「無權限」是全域事實)。後端還沒有
  connector 端點,目前是存在 localStorage 的使用者偏好。
