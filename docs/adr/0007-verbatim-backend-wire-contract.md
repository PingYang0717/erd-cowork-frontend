# 0007. 線路型別即應用型別（verbatim 後端契約）

日期:2026-08-25

## 狀態

Accepted。取代 `api/liveAdapter.ts` 的轉換層路線;修訂 [ADR-0006](0006-scenario-drives-clarification.md) 中「答案以結構化形式回傳」的線路部分(表單本身與 Scenario 驅動反問的決策不變)。

決策 4「傳輸為 hybrid」已被 [ADR-0009](0009-no-mock-backend-at-runtime.md) 取代:runtime
不再有 mock 後端,未實作的端點改為 api 模組回 stub 或在 UI 停用。verbatim 契約本身不變。

## 背景

後端(cowork master,Spring Boot + MongoDB)已實作完成,契約已鎖定:
`SendMessageRequest(question, baseArtifactId)`、Message 以 Mongo 文件形狀上線
(`sender`、`stepsJson`/`questionsJson` JSON 字串、`artifactTitle`)、messages 與 files
內嵌在 `GET /sessions/{id}`、檔案為 session 層級 multipart、Artifact 內容直接回
text/html、反問是扁平的 `Question[]`。

先前的做法是把這些差異收在 `liveAdapter` 一層,UI 讀本專案自己的形狀。產品決策
(2026-08-25)改為 **verbatim**:`types/api/` 直接採用後端 DTO 形狀,前端概念不上線路。

## 決策

1. **`types/api/` 與後端 DTO 逐字一致**,UI 在使用點解析(`stepsJson` 之類),不設轉換層。
2. **前端-only 的欄位一律標註為 extension**:`Session.pinnedAt`、`Message.scenario` /
   `attachments`、QUESTION 事件的 `form?: QuestionForm`。mock 會回,真後端不回,UI 降級。
3. **反問答案組成自然語言**(`utils/composeAnswerText.ts`,值以選項 label 呈現)當新訊息
   送出;等待反問中的 session 收到任何訊息都視為答案。
4. **傳輸為 hybrid**:真後端實作的端點在 live 模式放行(method-aware 過濾),其餘
   (session CRUD、artifacts 清單/分享/版本、connectors、directory、DC item、schedule)
   永遠由 MSW 服務。
5. 後端補不上的能力整理成[後端回饋清單](../api/backend-feedback.md),不在前端硬湊。

## 後果

- 接真後端只需 `VITE_AGENT_TRANSPORT=live` + `VITE_API_BASE_URL`,沒有形狀落差。
- live 模式下分析條件表單降級成一排 chip(`utils/liftQuestions.ts`,單向且失真),
  「已設定 N 項」的 AnsweredConditions 摘要卡隨結構化答案一併移除——自然語言的
  user message 就是紀錄。
- `stepsJson` 的 JSON 字串滲入 UI 解析點(集中在 `MessageList.parseSteps`),這是
  verbatim 的代價,刻意不再包一層。
