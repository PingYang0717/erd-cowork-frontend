# 10: AI 回覆 Markdown 渲染

**What to build:** Agent replies render as formatted text rather than a single paragraph.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] 引入 `react-markdown` + `remark-gfm`
- [x] AI 訊息內文改為 Markdown 渲染：清單、粗體、表格、行內與區塊程式碼
- [x] 樣式沿用 `MessageList.module.css` 的既有字級／行高（`fs13.5` / `lh1.6`），不引入外部 typography 樣式
- [x] 逐字串流期間也走同一個渲染器（不完整的 Markdown 不得使畫面崩壞）
- [x] Seam test：推一段含清單與表格的 TOKEN 串流，斷言渲染為 `<ul>` / `<table>`；推一段中途截斷的 Markdown，斷言不拋錯

## Comments

**2026-08-25:** 渲染抽成 `ReplyText.tsx`，歷史訊息與串流中的逐字回覆共用同一個
renderer——否則兩者的排版會在串流結束的瞬間跳動。半截的 Markdown（`- Ids` 還沒收到
`at stable`）被當成字面文字處理，不會讓 renderer 崩壞，測試有蓋到。

寬表格在自己的 `overflow-x` 容器內捲動（issue 12 的 AC 也要求同一件事，這裡先對
Markdown 表格做掉）。
