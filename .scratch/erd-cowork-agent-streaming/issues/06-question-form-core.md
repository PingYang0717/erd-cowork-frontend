# 06: 反問機制骨幹

**What to build:** The agent can ask the user a structured form mid-run, and the answer comes back structured.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] `QuestionForm` schema：`formKey` / `title` / `intro?` / `fields[]` / `submitLabel` / `disabledHint` / `summaryLabel`
- [x] `QuestionField` schema：`key` / `label` / `kind` / `options?` / `required` / `placeholder?` / `hint?` / `allowCustom?` / `visibleWhen?`
- [x] Field registry：`single` / `multi` / `text` / `boolean` / `daterange` 由通用渲染器處理（`dcitem` 見 issue 09）
- [x] `visibleWhen: { field, equals }` 控制欄位顯示；上游欄位值改變時清空所有依賴它的下游欄位答案
- [x] 送出鈕在 `required` 欄位未填齊時 disabled，旁邊顯示 `disabledHint`
- [x] 答案以結構化形式回傳：`POST /sessions/:sessionId/messages` 帶 `{ answers, inReplyTo }`，**不**組成自然語言再送
- [ ] 送出後表單收合成 `summaryLabel` 摘要（可展開檢視已選條件），並隨 QUESTION 事件與答案一起進入對話歷史
- [x] Seam test：推一個含 `visibleWhen` 的 QUESTION 事件，斷言依賴欄位的顯示／隱藏與清空、disabled 提示、送出後的結構化 request body 與收合摘要

## Comments

**2026-08-25:** 骨幹完成，除了「送出後收合成 summaryLabel 摘要」那一條。

那一條**不能在這張票做**：送出答案會開始新的一輪串流，`START` 會重置 reducer，
反問卡隨之卸載——所以摘要不可能是卡片的本地狀態，它必須是對話歷史的一部分。
而要讓歷史裡有它，得等 mock backend 真的會發出 QUESTION 並持久化答案，那是 issue 07。
已把該條移到 07。

`visibleWhen` 的清空是「刪除答案」不是「隱藏答案」——否則會送出一個使用者已經看不到、
且不屬於當前角色的 Flow。

欄位種類目前只實作了 chip 類（`single` / `multi`）。`text` / `boolean` / `daterange`
的渲染器由 07/08 的實際表單逼出來，`dcitem` 由 09。
