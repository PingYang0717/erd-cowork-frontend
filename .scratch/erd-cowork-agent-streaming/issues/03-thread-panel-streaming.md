# 03: ThreadPanel 改接串流

**What to build:** The thread renders a live agent run instead of a timer-driven replay.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `ThreadPanel` 改用 `useAgentStream`；移除 `STEP_DURATION_MS`、`pendingAi` state 與兩支計時器 `useEffect`
- [ ] 步驟卡狀態直接讀 STEP 事件的 `status`（含新增的 ERROR 態視覺），不再由 index 推算
- [ ] TOKEN 逐字累積顯示；ANSWER 收尾
- [ ] 執行期間顯示「停止」鈕；按下後立即顯示中止指示，對話串保留已產生內容
- [ ] 連線意外中斷顯示「連線中斷，請重新送出一次」，與主動中止區分
- [ ] 一輪結束後顯示耗時
- [ ] 串流結束後 invalidate `['messages', sessionId]` 與 sessions 清單，且在 DONE 前 await 完成以免畫面閃爍
- [ ] 跨欄最小狀態（`activeArtifactId` / `isStreaming`）進新的 Zustand store，供 `ArtifactPanel` 讀取
- [ ] Seam test：以可控串流斷言每個中間態——第 N 步 running、逐字累積中、按下停止的瞬間、斷線訊息、耗時
