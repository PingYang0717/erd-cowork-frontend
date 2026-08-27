# 以 SSE 串流取代一次回覆的批次契約

> **狀態註記(2026-08-27)**:本文最後一段「live 模式不覆蓋整個 app / 切換是 build-time
> 環境變數」已被 [ADR-0009](0009-no-mock-backend-at-runtime.md) 取代——runtime 不再有
> mock 後端,也沒有模式開關。SSE 的決策本身不變。

原本的對話流程是：`POST /sessions/:sessionId/messages` 一次回傳 `{ userMessage, aiMessage }`，`aiMessage.steps` 已經全部算好，前端用一支 500ms 的計時器把步驟逐一揭露，跑完把整則訊息塞進快取。這是為了在沒有後端的情況下先把畫面做出來的權宜設計。

我們改成 Server-Sent Events：同一個端點改回 `text/event-stream`，逐筆推送 Agent event（STEP / TOKEN / ANSWER / ARTIFACT / THINKING / QUESTION / CODE / TABLE / ERROR），由 `useAgentStream` 的 reducer 累積成畫面狀態。

理由：批次契約在結構上表達不了三件我們要做的事——執行途中向使用者反問（QUESTION 必須在流程中段送達，批次回覆時整段流程已經跑完）、逐字回覆與思考過程（沒有時間維度）、使用者中止（沒有可中止的連線）。前端的 500ms 計時器揭露的是**假的進度**：它揭露的是後端早就算完的結果，步驟不可能失敗，因此 UI 只有 pending / running / success 三態。改成串流後步驟狀態由後端明講（含 ERROR），中止、斷線、耗時都成為真實可觀測的狀態。

**兩條軌道都走 SSE。** mock 模式由 MSW 吐 `text/event-stream`，live 模式由後端吐；差別只在 SSE 從哪裡來，UI 與狀態機完全相同。我們刻意不保留舊的批次契約當作第二條軌道——那會讓 `ThreadPanel` 同時維護計時器揭露與串流揭露兩套狀態機，是最容易腐化的地方。代價是現有依賴 `vi.useFakeTimers()` 與 `advanceTimers(500 * N)` 的測試必須改寫。

**live 模式不覆蓋整個 app。** 可搭配的既有後端只有 session / message / artifact HTML / file / config 這幾組端點；Artifacts 總覽的清單與釘選、分享、Directory、Schedule、Connectors、Artifact 版本清單都沒有對應實作。因此 live 模式下這些端點仍由 MSW 服務，覆蓋範圍記在 `docs/api/interface.md`。切換是 build-time 的環境變數，不是 runtime 開關——runtime 開關會逼 MSW 常駐 production bundle。

**事件名稱維持 SCREAMING_CASE 原樣。** `STEP` / `TOKEN` / `ANSWER` 等是跨專案的線路契約，不套用本專案的 TypeScript 命名慣例，這樣 live 模式接上時不需要任何轉換層，日後比對兩邊也不必維護翻譯表。

**ERROR 事件不關閉串流。** 錯誤發生後後端仍會送出收尾的 STEP，串流由連線關閉本身結束。這一點反直覺但是刻意的，寫在 `docs/api/interface.md` 裡以免被「修正」。
