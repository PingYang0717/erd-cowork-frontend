# 0003. 線路型別即應用型別,Agent 事件以 SSE 串流

日期:2026-08-28

## 背景

後端(Spring Boot + MongoDB)的契約已鎖定:`SendMessageRequest(question, baseArtifactId)`、
Message 以 Mongo 文件形狀上線(`sender`、`stepsJson` / `questionsJson` 是 JSON **字串**、
`artifactTitle`)、messages 與 files 內嵌在 `GET /sessions/{id}`、檔案是 session 層級的
multipart、Artifact 內容直接回 `text/html`、反問是扁平的 `Question[]`。

這些形狀與前端想要的形狀有落差。曾經有一層 `api/liveAdapter.ts` 負責轉換,讓 UI 讀
本專案自己的型別。

對話回覆也曾是批次的:`POST /sessions/:id/messages` 一次回傳
`{ userMessage, aiMessage }`,`aiMessage.steps` 已全部算好,前端用一支 500ms 計時器把
步驟逐一揭露。

## 決策

**1. `types/api/` 與後端 DTO 逐字一致,不設轉換層。** UI 在使用點自己解析
(`stepsJson` 之類,集中在 `MessageList.parseSteps`)。前端的概念不上線路。

**2. 前端-only 的欄位一律標註為 extension**:`Session.pinnedAt`、`Message.scenario` /
`attachments`、QUESTION 事件的 `form?: QuestionForm`。mock 會回,真後端不回,UI 降級。

**3. 反問答案組成自然語言當新訊息送出**(`utils/composeAnswerText.ts`,值以選項 label
呈現)。等待反問中的 session 收到任何訊息都視為答案。不把剛組出來的文字再解析回結構——
那是憑空製造一個會壞的環節。

**4. Agent 事件以 SSE 串流。** 同一個端點回 `text/event-stream`,逐筆推送九種事件
(STEP / TOKEN / ANSWER / ARTIFACT / THINKING / QUESTION / CODE / TABLE / ERROR),由
`useAgentStream` 的 reducer 累積成畫面狀態。批次契約在結構上表達不了三件事:執行途中
反問(QUESTION 必須在流程中段送達)、逐字回覆與思考過程(沒有時間維度)、使用者中止
(沒有可中止的連線)。前端那支 500ms 計時器揭露的是**假的進度**——它揭露的是後端早就
算完的結果,步驟不可能失敗。

**5. 事件名稱維持 SCREAMING_CASE 原樣。** `STEP` / `TOKEN` / `ANSWER` 是跨專案的線路
契約,不套用本專案的 TypeScript 命名慣例,這樣不需要任何轉換層,日後比對兩邊也不必
維護翻譯表。

**6. ERROR 事件不關閉串流。** 錯誤發生後後端仍會送出收尾的 STEP,串流由連線關閉本身
結束。這一點反直覺但是刻意的,寫在這裡與 `docs/api/interface.md` 裡以免被「修正」。

**7. 後端補不上的能力整理成[後端回饋清單](../api/backend-feedback.md)**,不在前端硬湊。

## 後果

- 接真後端沒有形狀落差,也不需要任何環境變數。
- 分析條件表單在真後端下降級成一排 chip(`utils/liftQuestions.ts`,單向且失真),
  「已設定 N 項」的摘要卡隨結構化答案一併移除——自然語言的 user message 就是紀錄。
- `stepsJson` 的 JSON 字串滲入 UI 解析點,這是 verbatim 的代價,刻意不再包一層。
- 串流那條路走 raw `fetch`(axios 無法逐塊讀 body),因此 MUST 自行帶
  `getAuthHeaders()`——見 [ADR-0007](0007-cowork-file-parity-for-api-seams.md)。
