# Code Review — 整份專案（fix/button-dropdown-style）

以 `/code-review` 兩軸方法審查：**Standards**（是否符合本 repo 記載的撰寫慣例）與
**Spec**（是否忠實實作 spec）。兩軸由獨立 sub-agent 平行進行，報告刻意不合併、不重排。

| 項目        | 值                                                             |
| ----------- | -------------------------------------------------------------- |
| Review 日期 | 2026-08-27                                                     |
| 固定基準點  | `dde9d33`（初始 commit）                                       |
| HEAD        | `fix/button-dropdown-style`（`eb12a2e` 後）                    |
| 範圍        | 126 commits、316 檔、+25130 / −6518                            |
| 前次 review | `docs/code-review-master.md`（2026-08-25）——已列項目只回報現況 |

---

## Standards

### 2026-08-25 硬性違規現況

1. **React.FC + 具名 props interface — 仍在，且變嚴重**：`SessionList.tsx:31,167`、
   `ThreadPanel.tsx:21,40,81`、`ArtifactPanel.tsx:28,52,117,247`、`StudioShell.tsx:19`、
   `ArtifactsGallery.tsx:185`、`FileAttachmentModal.tsx:24`、`providers.tsx:27,42`；新增
   `MessageBubble.tsx` 的 StepStatusIcon/StepRow/StepsRecap/LiveElapsed/Elapsed（部分
   宣告在 default export 之後）。
2. **元件內部順序 — 仍在**：`ChatComposer.tsx:76-91`、`ThreadPanel.tsx:92-101`。
3. **子元件 handler useCallback — 仍在**：`StudioLayout.tsx:27`、`useSessionGroups.ts`、
   `useFileAttachments.ts`。
4. **`useArtifactRepair.ts:31` inline endpoint — 仍在**。
5. **~15 個 CSS Module 硬寫 `#fff` — 仍在**（如 `MessageBubble.module.css:19`）。
6. **FilterPill 宣告位置 — 仍在**（`ArtifactsGallery.tsx:185`）。

### 新硬性違規

- `HtmlCodePanel.tsx:44-63`：`useEffect`+`useState` 抓 HTML，繞過 TanStack Query
  （鐵律 1/2；核可逃生艙是 `useQuery`+書面理由，見 `useArtifactContent`）。
- `useConnectorMutations.ts`：兩個 mutation 缺 `onError`；`localStorage.setItem`
  quota 失敗會靜默。
- **Code 與文件矛盾**：寫入端點全面 live，但 `interface.md`:12,43-44,195-196,284-285
  仍寫「停用／唯讀」；ADR-0009 未修訂；interface.md:151 與 :12 自相矛盾。
- `MessageBubble.tsx:313`：`onSubmit={onAnswer ?? (() => {})}` 每 render 新 identity。

### 判斷題（smells）

- Duplicated Code：`useActionErrorToast` 於 `useSessionMutations.ts:14-17` 與
  `useArtifactMutations.ts:12-15` 整段複製（連註解）。
- Duplicated Code（舊）：StepsRecap/HtmlCodePanel 再度手刻 CollapsiblePanel 的
  chevron/aria-expanded 形狀。
- `MessageList.tsx:159-163`：inline `artifact={{...}}` 每 token 打破 MessageBubble memo。
- `ResultTable.tsx:92`：`components.table` inline 函式每 render 重建。
- `SessionList.tsx:54-55`：過時註解與下一行矛盾。
- Dead export：`useSessionGroups.ts` 的 `sortByRecency`。
- Glossary 漂移：`types/api/artifact.ts:21` 註解仍用「重新生成」。
- Repeated Switches：`ConnectorsPanel.tsx:57-88` statusMeta/toggleIcon 仍平行串接。

`tsc --noEmit` 與 `eslint --quiet` 乾淨。

---

## Spec

### 2026-08-25 發現現況

1. DC picker 單選 — **仍開**（issue 09 要多選；`QuestionFormCard.tsx:145-159`）。
2. DC 答案未進串流 — 仍開，但已降為 mock/測試範圍（ADR-0009）。
3. 「項數偏多」開場文案 — **仍開**（字串不存在於 `src/`）。
4. `published` 未建模 — 已修（`types/api/artifact.ts:22,50`）。
5. run 後 sessions invalidate — 已修（`useAgentStream.ts:196`）。
6. repair offer 換 **artifact** 未清 — **仍開**（`ThreadPanel.tsx:105` 只看 sessionId；
   issue 13 要求兩者）。
7. 資料來源 chip 寫死 `Inline DB · N5 line` — **仍開**（ticket 10）。
8. `baseArtifactId` 未送 — 已修（`ThreadPanel.tsx:135`）。

### (a) 缺漏或只做一半

新工作無新缺漏；checklist 兩個未勾項（`Artifact.type`、internal 身分開關）確實未做。

### (b) 範圍蔓延

- `sessionApi.createSession`（`sessionApi.ts:13`）：checklist 明言前端不打
  `POST /sessions`，無非測試呼叫者——死的 prod 面。

### (c) 已實作但漂移

- `api-checklist.md` 表格與自己的定案矛盾：#4–#6、#17–#18 仍標 🚫 停用、#5 仍寫
  `PATCH { pinnedAt }`，但 code 已是 `POST /pin` 且全面解禁。
- `SessionList.tsx:54` 過時註解。

### 已驗證成立（抽查）

八項 API 定案全數落地（pin toggle POST、`{code,message}`+`FILES_EXPIRED`、delete 200
容忍）；無殘留後端型 disabled（剩 pending/streaming/驗證/`canPin`/`no_access` 皆正當）；
Regenerate 乾淨移除；connector prefs key 正確；ADR-0010 清單全數存在；比對文件 §6/§7
「已補」聲明屬實。

---

**總結**：Standards＝4 新硬性違規＋6 舊項未清＋8 判斷題（最嚴重：HtmlCodePanel 繞過
TanStack Query）；Spec＝4 舊項未清＋1 蔓延＋2 文件漂移（最嚴重：DC picker 仍不符
issue 09 的多選要求）。
