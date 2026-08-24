# 12: 查詢結果表格

**What to build:** Query results the agent ran along the way are visible in the thread.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] TABLE 事件依到達順序累積並渲染於對話串中：`intent` 作為標題、`columns` / `rows`、`truncated` 時顯示截斷提示
- [x] 儲存格值型別為 `string | number | boolean | null`，`null` 顯示為空白
- [x] 表格不進入對話歷史
- [x] 寬表格於自身的 `overflow-x` 容器內捲動，不使對話串橫向捲動
- [x] Seam test：推兩個 TABLE 事件（其一 `truncated: true`），斷言兩張表依序出現、截斷提示、重載後不在歷史中
