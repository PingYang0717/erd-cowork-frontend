# 01: SSE 傳輸骨幹

**What to build:** The pure, UI-free machinery that turns an HTTP stream into agent state.

**Blocked by:** 00

**Status:** ready-for-agent

- [ ] `src/utils/sseParser.ts`：自 `cowork-master` 原樣移植（含其測試）——增量解析、`:` 開頭的心跳行忽略、解析失敗靜默丟棄該區塊
- [ ] `src/types/api/agentEvent.ts`：`AgentEvent` 九型聯集（SCREAMING_CASE）、`StepItem`、`StepStatus`、`QuestionForm`、`QuestionField`、`QuestionOption`、`TableResult`
- [ ] `src/features/thread/api/agentApi.ts`：`streamAgentMessage()` async generator，raw `fetch`（非 axios），自行接上 `VITE_API_BASE_URL`；`AgentStreamHttpError` 承載串流開始前的非 2xx `{code, message}`；`AbortError` 原樣往上拋
- [ ] `src/features/thread/hooks/useAgentStream.ts`：reducer 移植——`isStreaming` / `stopped` / `networkError` / `steps` / `liveText` / `answer` / `artifact` / `error` / `thinking` / `question` / `codeText` / `tables` / `durationMs` / `startedAt`；`send` / `stop` / `reset`；unmount 時 abort
- [ ] ERROR 事件**不**結束串流（只寫入 `error`，串流由連線關閉結束）
- [ ] `MessageStep` 與 `StepItem` 合併為單一型別（`stepKey` / `title` / `description` / `status`），`status` 含 `ERROR`
- [ ] Seam test：餵一段含心跳、跨 chunk 切斷、格式錯誤區塊的 SSE 位元流，斷言 reducer 累積出正確狀態
