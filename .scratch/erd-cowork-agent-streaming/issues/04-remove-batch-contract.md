# 04: 移除舊批次契約與既有測試遷移

**What to build:** No trace of the timer-driven batch reply remains.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] 刪除 `SendMessageResult` 型別與 `messageApi.sendMessage`（`listMessages` 保留）
- [x] 刪除 `src/features/thread/hooks/useSendMessage.ts`
- [x] 刪除 `MessageList.tsx` 的 `PendingAiMessage`、`AiWorkingSteps`、`stepStatus()`
- [x] `ChatComposer` 的五顆按鈕保留，維持送出 `scenarioKey` 與 `artifactKind`（[ADR-0006](../../../docs/adr/0006-scenario-drives-clarification.md)：Scenario 沒有降級）
- [x] 4 支受影響的測試改寫為可控串流：`StudioPage.chat.test.tsx` / `.file-attachments.test.tsx` / `.generate-coach.test.tsx` / `.connectors.test.tsx`，保留原本測試意圖，移除 `vi.useFakeTimers()` 與 `advanceTimers(500 * N)`
- [x] 全專案搜尋確認無殘留的 500ms 計時器揭露邏輯
