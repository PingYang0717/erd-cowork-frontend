# 01: SSE 傳輸骨幹

**What to build:** The pure, UI-free machinery that turns an HTTP stream into agent state.

**Blocked by:** 00

**Status:** ready-for-agent

- [x] `src/utils/sseParser.ts`：自 `cowork-master` 原樣移植（含其測試）——增量解析、`:` 開頭的心跳行忽略、解析失敗靜默丟棄該區塊
- [x] `src/types/api/agentEvent.ts`：`AgentEvent` 九型聯集（SCREAMING_CASE）、`StepItem`、`StepStatus`、`QuestionForm`、`QuestionField`、`QuestionOption`、`TableResult`
- [x] `src/features/thread/api/agentApi.ts`：`streamAgentMessage()` async generator，raw `fetch`（非 axios），自行接上 `VITE_API_BASE_URL`；`AgentStreamHttpError` 承載串流開始前的非 2xx `{code, message}`；`AbortError` 原樣往上拋
- [x] `src/features/thread/hooks/useAgentStream.ts`：reducer 移植——`isStreaming` / `stopped` / `networkError` / `steps` / `liveText` / `answer` / `artifact` / `error` / `thinking` / `question` / `codeText` / `tables` / `durationMs` / `startedAt`；`send` / `stop` / `reset`；unmount 時 abort
- [x] ERROR 事件**不**結束串流（只寫入 `error`，串流由連線關閉結束）
- [x] `MessageStep` 與 `StepItem` 合併為單一型別（`stepKey` / `title` / `description` / `status`），`status` 含 `ERROR` — 於 issue 03 完成
- [x] Seam test：餵一段含心跳、跨 chunk 切斷、格式錯誤區塊的 SSE 位元流，斷言 reducer 累積出正確狀態

## Comments

**2026-08-25:** 除了「`MessageStep` 與 `StepItem` 合併」以外全部完成（那一條要等
issue 03/04 把 `MessageList` 接上串流時才能一起做，現在動會讓既有 10 支 StudioPage
測試無謂地紅一輪）。

實作順序由 hook seam 的 TDD 逐片驅動：TOKEN 累積 → isStreaming 生命週期 →
STEP upsert → stop 中止 → 事件分流（ANSWER/ARTIFACT/QUESTION/THINKING/CODE/TABLE）
→ ERROR 不結束串流 → HTTP 失敗 → 非預期斷線 → 耗時 → reset → unmount 中止。

兩件實作時才發現的事：

1. **中止訊號傳不進 mock 的 response body。** MSW 的 `HttpResponse(ReadableStream)`
   沒有接上 request signal，`reader.read()` 不會自己 reject，所以 `agentApi` 直接掛
   abort 監聽去 `reader.cancel()`——in-flight 的 read 隨即以 done 收尾。真後端走
   fetch 的 signal 會正常拋 AbortError，兩條路都涵蓋在測試裡。
2. **`src/test/README.md` 原本寫「本專案唯一的測試 seam 是網路邊界」**，雙層 seam
   的決定推翻了它，已一併改寫，避免文件默默漂移。
