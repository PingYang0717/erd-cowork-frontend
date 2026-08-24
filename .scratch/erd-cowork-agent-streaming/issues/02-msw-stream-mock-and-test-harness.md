# 02: MSW 串流 mock 與測試工具

**What to build:** Tests and the mock backend can drive an SSE stream event by event.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `POST /sessions/:sessionId/messages` 的 MSW handler 改回 `text/event-stream`，以 `ReadableStream` 逐筆寫出 `data: {json}\n\n`
- [ ] 測試工具：`pushAgentEvent(event)` / `closeAgentStream()`，讓測試決定何時吐下一個事件；不使用 fake timers
- [ ] mock 端依 `scenarioKey`（按鈕）或 `matchScenario(text)`（自由文字）決定重播哪一份腳本；`SCENARIO_FIXTURES` 保留為 mock 內部實作
- [ ] 可模擬：使用者中止（AbortSignal）、串流開始前的非 2xx、串流中途連線斷開、心跳
- [ ] Seam test：測試工具本身可推進一段串流並在中途斷言
