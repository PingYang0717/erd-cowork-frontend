# 11: Artifact 產碼面板

**What to build:** Users can watch the artifact HTML being written.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] CODE 事件的 delta 累積顯示在可摺疊的程式碼面板中，等寬字體，自動捲到最新
- [x] 面板不進入對話歷史
- [x] 依 `features/thread/` 的 CSS Module 慣例重寫
- [x] Seam test：推一串 CODE 事件，斷言面板出現、內容累積、可展開／收合；串流結束後重載對話，斷言不在歷史中

## Comments

**2026-08-25:** Thinking / HTML 兩個面板的外框抽成 `CollapsiblePanel`——它們是同一個
形狀：「一個帶標籤的收合鈕，罩住只屬於這次連線的東西」。`ThinkingPanel` 一併改用它。
