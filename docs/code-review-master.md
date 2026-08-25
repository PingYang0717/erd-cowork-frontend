# Code Review — master branch

以 `/code-review` 的兩軸方法對 `master` 進行審查：**Standards**（是否符合本 repo 記載的撰寫慣例）與 **Spec**（是否忠實實作原始 issue / spec）。兩軸由各自獨立的 sub-agent 平行進行，避免互相污染判斷，因此下方兩份報告刻意不合併、不重新排序。

| 項目                     | 值                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review 日期              | 2026-08-25                                                                                                                                                                   |
| 固定基準點 (fixed point) | `dde9d33`（初始 commit）                                                                                                                                                     |
| HEAD                     | `75703eb`                                                                                                                                                                    |
| Diff 指令                | `git diff dde9d33...HEAD`                                                                                                                                                    |
| 範圍                     | 66 個 commit、258 個檔案、+19902 / −5468                                                                                                                                     |
| 慣例來源                 | `AGENTS.md`、`architecture.md`、`CONTEXT.md`、`README.md`、`docs/adr/0001..0006`、`docs/agents/domain.md`                                                                    |
| Spec 來源                | `.scratch/erd-cowork-frontend/`（票 14–18）、`.scratch/erd-cowork-agent-streaming/`、`.scratch/erd-cowork-design-fidelity/`、`.scratch/erd-cowork-architecture-conventions/` |

---

## Standards（撰寫慣例）

`src/features/**` 與 `src/services/**` 在 HEAD **已完全刪除** — 沒有殘留、沒有失效的 import，佈局符合 `architecture.md` §1。五條鐵律成立：Zustand 沒放 API 資料、全面使用 `useSuspenseQuery`，唯一的 `useQuery` 例外（`src/hooks/useArtifactContent.ts:6-13`）也寫明了理由。

### 硬性違規

1. **`React.FC<Props>` + 具名 props interface**（AGENTS.md 六條撰寫規則 › 元件：「一律 `React.FC<Props>` + 具名 props interface」，唯一豁免是 `ErrorBoundary`）。約 15 個元件寫成一般函式搭配 inline prop 型別而違規：`src/components/session/SessionList.tsx:31`（`SessionRow`）、`:137`（`SessionGroup`，已匯出且跨檔使用）、`src/components/chat/MessageList.tsx:55,70,145,181`、`src/components/chat/ThreadPanel.tsx:21,40,72`、`src/components/artifact/ArtifactPanel.tsx:27,51,67,178`、`src/components/layouts/StudioShell.tsx:19`、`src/components/gallery/ArtifactsGallery.tsx:180`、`src/components/files/FileAttachmentModal.tsx:24`、`src/app/providers.tsx:27,42`。
2. **元件內部順序**（architecture.md §3：hooks → useState → useRef → 衍生值 → useEffect）。`src/components/chat/ChatComposer.tsx:79-92` 把 `useState` 放在自訂 hook / store hook 之前；`src/components/chat/ThreadPanel.tsx:85-86` 把 `useRef` 放在一個 `useEffect` 之後。
3. **傳給子元件的 handler 一律 `useCallback`**（AGENTS.md 效能）。傳給 `ResizeHandle` 的 inline arrow：`src/components/layouts/StudioLayout.tsx:25-28`、`src/components/layouts/StudioShell.tsx:51-56`。從 hook 回傳、再往下傳但未 memo 的函式：`src/hooks/useSessionGroups.ts:30,35`、`src/hooks/useFileAttachments.ts:29,69,74`（→ `FileAttachmentModal`）。
4. **endpoint module 要放在 `src/api/`**（architecture.md §5）。`src/hooks/useArtifactRepair.ts:20` 直接 inline 呼叫 `apiClient.post('/artifacts/${artifactId}/repair')` — 是唯一沒有對應 module 的 endpoint。
5. **元件內不得寫死顏色**（architecture.md §8）。`color: #fff` 出現在 15 個 CSS Module，例如 `src/components/chat/MessageList.module.css:20`、`src/components/artifact/ArtifactPanel.module.css:89,114,175`。`src/theme/tokens.ts` 裡沒有對應的 token。
6. **檔案內順序**（props interface → hooks → handlers → render → export default）：`FilterPill` 宣告在已匯出元件之後，位於 `src/components/gallery/ArtifactsGallery.tsx:180`。

### 判斷題（smell baseline）

- **Repeated Switches** — `src/components/connectors/ConnectorsPanel.tsx:57-101`：`statusMeta`、`toggleIcon`、`toggleTitle` 三者各自對 `ConnectorStatus` + `isPending` 做一次串接判斷。一個 `Record<ConnectorStatus, …>` 就能同時服務三者。
- **Duplicated Code** — `src/components/artifact/ArtifactPanel.tsx:84-85` 與 `ArtifactFullPageView.tsx:50-51` 有完全相同的 `activeVersion` fallback，加上幾乎相同的 share / refresh / 開新分頁工具列與 `ShareArtifactDialog` 接線。
- **Duplicated Code** — 已經有 `CollapsiblePanel` 負責 chevron / `aria-expanded` 這個展開收合形狀，卻在 `AnsweredConditions.tsx:46-62`、`MessageList.tsx:148-162`、`SessionList.tsx:159-172` 各自手刻一次。
- **Duplicated Code** — pin 的 label / icon 配對重複於 `SessionList.tsx:50-52` 與 `ArtifactCard.tsx:38-40`。
- `useArtifactRepair.ts:31` 手寫 `['artifacts', artifactId]`，而非使用已匯出的 `artifactQueryKey(id)` — 共用前綴的用意因此失效。
- `useFileAttachments.ts:42-44` 把字面字串 `'僅支援 .csv / .xlsx'` 同時當作值與去重的 key，重複了兩次。

---

## Spec（規格對照）

**測試：** `npm test -- --run` → **26 個檔案、152 個測試，全數通過、0 失敗。** 重構 spec 宣稱的「139 個測試」成立：layer-first 區間（`d92a2f9..HEAD`）只有檔案改名、沒有刪除任何測試，並為新慣例（Tooltip / ErrorBoundary / identity / debounce）新增約 13 個案例。

### (c) 看似實作了，但實作有誤

1. **DC item picker 是單選。** `09-dc-item-card.md`：「`dcitem` field kind 的專屬元件：可搜尋清單…**多選勾選**」。`QuestionFormCard.tsx:137-152` — `toggle()` 先判斷 `boolean`、再判斷 `multi`，`dcitem` 掉進最後一個分支 `{...previous, [field.key]: value}`，因此選第二項會**取代**第一項，而 `ChipGroup.isSelected`（`:69-78`）也只會標記一項為 pressed。送出按鈕的「先產生這 N 項」因此永遠不可能超過 1。接縫測試（`StudioPage.streaming.test.tsx:623`）只點了一項，所以照樣通過。

### (a) 缺漏或只做一半

2. **選取的 DC items 不影響結果。** 同一張票：「送出後…最終 Artifact 只含選定項目」。`handlers.ts:493` 呼叫 `streamRun(sessionId, pending.scenarioKey, pending.artifactKind, extraSteps)`，`body.answers` 從未被讀取；只有「過濾」那個 step 是裝飾性的。相關地，`POST /api/dc-items`（`handlers.ts:519`）在 `src/` 中除了 mock 外沒有任何呼叫端，所以「自訂新增」從來不會真的建立項目。
3. **「項數偏多」的 intro 變體**（「…張數較多、產生會久一點。建議先留 3–5 項…」）不存在 — `questionFixtures.ts:145-148` 只有一段固定 intro，該字串在整個 repo 中都找不到。
4. **`ArtifactVersion.published` 從未被建模。** `02-artifact-version-generated-state.md`：「`ArtifactVersion` contract carries its own **generated/published** fields；`docs/api/interface.md` … updated」。`types/api/artifact.ts:24-36` 只有 `generated`；`VersionSwitcher.tsx:93` 拿 `v.generated` 去充當票 04 的「published」綠色勾勾；`docs/api/interface.md` 裡也沒有 `published`。
5. **跑完一次 run 後沒有 invalidate sessions 清單。** `03-thread-panel-streaming.md`：「invalidate `['messages', sessionId]` 與 **sessions 清單**」。`ThreadPanel.tsx:116,128` 只 invalidate `['sessions', id, 'messages']`，這個 key 無法前綴比對到 `sessionsQueryKey = ['sessions']`（`useSessions.ts:5`）。
6. **修復提議會在切換 Artifact 後殘留。** `13-artifact-repair.md`：「切換 Session **或切換到不同 Artifact** 時清除提議」。`ThreadPanel.tsx:85` 只在 `sessionId` 改變時清除，沒有任何地方監看 `artifactId`，因此舊的提議會留著，而且「修復」會指向舊的 artifact。
7. **資料來源 chip 是寫死的。** `10-thread-data-source-chip.md`：chip 應「reflecting the current session/Scenario's data source」。`ThreadPanel.tsx:31-34` 直接渲染字面值 `Inline DB · N5 line`；`types/api/session.ts` 裡也沒有任何 data-source 欄位。

### (b) 範圍蔓延

沒有發現。Schedule 維持 7 行的 stub；澄清表單與 gallery 的 id 去重都是 spec 自己記載過的推翻決定。唯一雜項：`baseArtifactId`（`api/agentApi.ts:32,56`）每次請求 body 都會帶上，但沒有任何呼叫端曾經設定它。

---

## 總結

| 軸        | Findings                  | 該軸最嚴重的問題                                                                                                   |
| --------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Standards | 6 項硬性違規 + 6 項判斷題 | `React.FC<Props>` 慣例在 9 個檔案、約 15 個元件上被打破 — 這是 repo 自己訂下的規則，而重構分支宣稱已經落實它       |
| Spec      | 7 項（無範圍蔓延）        | DC item picker 在票明訂「多選」的情況下卻是單選 — 功能的核心互動根本不成立，現有測試之所以通過只是因為它只點了一項 |

兩軸刻意分開評分，不跨軸挑一個「總冠軍」—— 這正是兩軸分離要避免的重新排序。
