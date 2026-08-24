# 10: AI 回覆 Markdown 渲染

**What to build:** Agent replies render as formatted text rather than a single paragraph.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] 引入 `react-markdown` + `remark-gfm`
- [ ] AI 訊息內文改為 Markdown 渲染：清單、粗體、表格、行內與區塊程式碼
- [ ] 樣式沿用 `MessageList.module.css` 的既有字級／行高（`fs13.5` / `lh1.6`），不引入外部 typography 樣式
- [ ] 逐字串流期間也走同一個渲染器（不完整的 Markdown 不得使畫面崩壞）
- [ ] Seam test：推一段含清單與表格的 TOKEN 串流，斷言渲染為 `<ul>` / `<table>`；推一段中途截斷的 Markdown，斷言不拋錯
