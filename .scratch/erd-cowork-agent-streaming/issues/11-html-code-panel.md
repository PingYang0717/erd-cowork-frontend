# 11: Artifact 產碼面板

**What to build:** Users can watch the artifact HTML being written.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] CODE 事件的 delta 累積顯示在可摺疊的程式碼面板中，等寬字體，自動捲到最新
- [ ] 面板不進入對話歷史
- [ ] 依 `features/thread/` 的 CSS Module 慣例重寫
- [ ] Seam test：推一串 CODE 事件，斷言面板出現、內容累積、可展開／收合；串流結束後重載對話，斷言不在歷史中
