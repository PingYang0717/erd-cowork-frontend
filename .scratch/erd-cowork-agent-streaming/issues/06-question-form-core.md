# 06: 反問機制骨幹

**What to build:** The agent can ask the user a structured form mid-run, and the answer comes back structured.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `QuestionForm` schema：`formKey` / `title` / `intro?` / `fields[]` / `submitLabel` / `disabledHint` / `summaryLabel`
- [ ] `QuestionField` schema：`key` / `label` / `kind` / `options?` / `required` / `placeholder?` / `hint?` / `allowCustom?` / `visibleWhen?`
- [ ] Field registry：`single` / `multi` / `text` / `boolean` / `daterange` 由通用渲染器處理（`dcitem` 見 issue 09）
- [ ] `visibleWhen: { field, equals }` 控制欄位顯示；上游欄位值改變時清空所有依賴它的下游欄位答案
- [ ] 送出鈕在 `required` 欄位未填齊時 disabled，旁邊顯示 `disabledHint`
- [ ] 答案以結構化形式回傳：`POST /sessions/:sessionId/messages` 帶 `{ answers, inReplyTo }`，**不**組成自然語言再送
- [ ] 送出後表單收合成 `summaryLabel` 摘要（可展開檢視已選條件），並隨 QUESTION 事件與答案一起進入對話歷史
- [ ] Seam test：推一個含 `visibleWhen` 的 QUESTION 事件，斷言依賴欄位的顯示／隱藏與清空、disabled 提示、送出後的結構化 request body 與收合摘要
