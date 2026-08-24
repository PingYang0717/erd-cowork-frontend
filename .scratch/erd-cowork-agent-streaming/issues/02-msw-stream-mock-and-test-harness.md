# 02: MSW 串流 mock 與測試工具

**What to build:** Tests and the mock backend can drive an SSE stream event by event.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] `POST /sessions/:sessionId/messages` 的 MSW handler 改回 `text/event-stream`，以 `ReadableStream` 逐筆寫出 `data: {json}\n\n` — 於 issue 03 完成
- [x] 測試工具（`src/test/agentStream.ts`）：`mockAgentStream()` 回傳 `push` / `close` / `disconnect` / `wasAborted`，`mockAgentStreamRejection()` 模擬串流開始前的非 2xx；不使用 fake timers
- [x] mock 端依 `scenarioKey`（按鈕）或 `matchScenario(text)`（自由文字）決定重播哪一份腳本；`SCENARIO_FIXTURES` 保留為 mock 內部實作 — 於 issue 03/07 完成
- [x] 可模擬：使用者中止（AbortSignal）、串流開始前的非 2xx、串流中途連線斷開、心跳
- [x] Seam test：測試工具本身可推進一段串流並在中途斷言（由 `useAgentStream.test.ts` 的 11 支測試證實）

## Comments

**2026-08-25:** harness 已完成（由 issue 01 的第一個 hook 測試逼出來）。剩下的兩條
（正式 handler 改回 `text/event-stream`、依 `scenarioKey` / `matchScenario` 重播腳本）
留給 issue 03——那要等 UI 真的接上串流，否則沒有東西會消費它。
