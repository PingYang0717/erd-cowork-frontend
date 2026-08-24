# 05: Thinking 面板

**What to build:** Users can see the agent's reasoning while it works, and it doesn't clutter the history.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] THINKING 事件的 delta 累積顯示在可摺疊面板中
- [x] 面板不進入對話歷史——串流結束後不再出現在重載後的對話串
- [x] 依 `features/thread/` 的 CSS Module 慣例重寫，不沿用 `cowork-master` 的 Tailwind 類名
- [x] Seam test：串流中推 THINKING 事件，斷言面板出現且可展開／收合；串流結束後重載對話，斷言 thinking 不在歷史中
