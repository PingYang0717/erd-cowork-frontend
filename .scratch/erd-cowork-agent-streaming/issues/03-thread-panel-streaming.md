# 03: ThreadPanel 改接串流

**What to build:** The thread renders a live agent run instead of a timer-driven replay.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] `ThreadPanel` 改用 `useAgentStream`；移除 `STEP_DURATION_MS`、`pendingAi` state 與兩支計時器 `useEffect`
- [x] 步驟卡狀態直接讀 STEP 事件的 `status`（含新增的 ERROR 態視覺），不再由 index 推算
- [x] TOKEN 逐字累積顯示；ANSWER 收尾
- [x] 執行期間顯示「停止」鈕；按下後立即顯示中止指示，對話串保留已產生內容
- [x] 連線意外中斷顯示「連線中斷，請重新送出一次」，與主動中止區分
- [x] 一輪結束後顯示耗時
- [x] 串流結束後 invalidate `['messages', sessionId]` 與 sessions 清單，且在 DONE 前 await 完成以免畫面閃爍
- [x] 跨欄最小狀態（`activeArtifactId` / `isStreaming`）進新的 Zustand store，供 `ArtifactPanel` 讀取
- [x] Seam test：以可控串流斷言每個中間態——第 N 步 running、逐字累積中、按下停止的瞬間、斷線訊息、耗時

## Comments

**2026-08-25:** 完成。實作時做出的三個判斷，都不在原本的 AC 裡：

1. **停止後的執行留在畫面上，但標籤改成「eRD AI · stopped」。** 原本的 live 區塊會
   繼續宣稱「eRD AI is working…」，而 `role="status"` 也還掛著——結束的執行不該再被
   螢幕閱讀器播報為進行中。`role="status"` 現在由 `isStreaming` 決定，不是由 `stopped`
   反推。
2. **耗時是對話串下方的獨立一行，不屬於任何訊息。** 一開始放進 live 區塊，結果完成
   的執行殘留在畫面上、和重新抓回的歷史重複。耗時不隨對話持久化，所以它是 footer。
3. **斷線訊息改用英文。** 從 cowork-master 抄來的是中文，但 ThreadPanel 其餘字串全是
   英文。mockup 的中文文案僅限澄清表單（issue 07–09），待與使用者確認整體語言策略。

另外新增了 `StepStatusIcon` 的 `aria-label`（Pending / Running / Done / Failed）——
先前四個狀態的 icon 全是 `aria-hidden`，螢幕閱讀器讀不出任何步驟狀態。
