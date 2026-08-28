# 深度審查修復紀錄(2026-08-28)

對 master(`78d2741`,tag V5 之後三次 merge)做的三軸深度審查——runtime 效能、
載入效能、可維護性——與隨後的逐項修復。審查的每個發現都標注了驗證等級
(VERIFIED = 實測或追完呼叫鏈 / INFERRED = 推論);修復在 `perf/deep-review`
branch 上,每項一個 commit,各自附回歸測試並驗證過 red-capable(把修復退掉,
測試必須變紅)。

## 總覽

| 項目       | 問題                                    | 成果                               |
| ---------- | --------------------------------------- | ---------------------------------- |
| P0-1       | 帶 artifact 的歷史泡泡每 token 全量重繪 | 10 → 0 次(probe 實測)              |
| P0-2       | ChatComposer 沒有 memo                  | 每 token 重繪輸入區 → 0            |
| P0-3       | 每 token 重解析整段 markdown,O(n²)      | `useDeferredValue`,測試契約不動    |
| P0-4       | 首屏 574 KB gzip                        | **405 KB(−29%)**                   |
| P1-5       | strict mode 未開                        | 3 個錯誤修完,全面開啟              |
| P1-6       | query key 前綴碰撞                      | publish/pin 不再重抓 artifact HTML |
| P1-7       | live-run 三重資料團塊                   | MessageBubble 19 → 12 props        |
| P1-8       | mocks/handlers.ts 750 行                | 按資源拆五檔                       |
| P1-9       | 測試 110s 序列牆                        | **30s**(4 workers,五輪零 flake)    |
| P1-10 / P2 | 依賴衛生與小項                          | 見下                               |

---

## P0 — 使用者可感

### P0-1 帶 artifact 的歷史泡泡每個 token 全量重繪(`aadb158`)

**根因**:`MessageList` 在 JSX 裡逐次新建 artifact 物件——一個新物件 prop 就足以
擊穿 `MessageBubble` 的 memo。probe 實測:純文字歷史泡泡 0 次重繪、帶 artifact 者
跟著 token 率(10–40/s)重繪,每次含 markdown 全文重解析。純文字泡泡沒事,所以
一直沒被看見。

**修法**:artifact 物件併入 `parsedHistory` 的 `useMemo`,與 steps/question 同一個
記憶點。

**回歸**:`StudioPage.stream-perf.test.tsx` 計數 probe——10 個 token 下歷史泡泡
必須 0 次、live 泡泡 >0。退掉修復實測 10 次,red-capable 成立。

### P0-2 ChatComposer 沒有 memo(`aadb158`)

**根因**:`ThreadPanel` 的註解宣稱 handleSend 穩定化是為了保護 ChatComposer 的
memo——**那個 memo 從未存在**。每 token 重繪 antd TextArea(含 autoSize 量測)、
Dropdown 與兩個 modal。

**修法**:`export default React.memo(ChatComposer)`;props 本來就全是 primitive
或 useCallback 穩定引用。

**回歸**:以 `$$typeof === Symbol.for('react.memo')` 直接驗 export。刻意
implementation-coupled:wrapper 計數法會自帶 memo 邊界而兩態皆綠(試過,真的是
套套邏輯),而拆掉 memo 是一行改動、沒有其他東西抓得到。

### P0-3 每 token 重解析整段 markdown,O(n²)(`c9ba754`)

**根因**:`liveText` 逐 token 累積,live 泡泡每次對**全文**跑 split + remark-gfm。
n 個 token 的總解析量 O(n²)——5000 字回覆累計等於解析一千兩百萬字。

**修法抉擇**:審查原案是 rAF/30ms 計時器節流,但 repo 測試教義明文「Nothing is on
a timer——每個中間狀態可觀察」,計時器要改寫三支最慢的 streaming 測試並推翻那段
文件。改走 `useDeferredValue`:事件管線與測試契約原封不動,昂貴解析變低優先級
渲染,React 忙碌時自動跳過中間值——回覆越長解析越貴、跳過越多,剛好對沖 O(n²)。

**三個落點**:`MessageBubble` 的 split+parse 吃 deferredText 並包 `useMemo`;
`ReplyText` 加 `React.memo`(承重牆:urgent render 時 deferred 未動,memo 才讓同
字串的 `<Markdown>` 真正跳過);`MessageList` scroll effect 依賴從 live 物件收窄為
實際影響高度的內容欄位。

**驗證侷限(誠實記錄)**:deferral 在 jsdom 量不到(act() 同步 flush),實效要在
真實瀏覽器以長回覆驗證。

### P0-4 首屏 574 → 405 KB gzip(`6238a3d`)

| 資產               | 之前 (gz)  | 之後 (gz)           |
| ------------------ | ---------- | ------------------- |
| 主 JS              | 407.2 KB   | 353.3 KB            |
| CSS                | 167.4 KB   | 51.3 KB             |
| MarkdownBody chunk | (在主包內) | 44.1 KB,lazy 非首屏 |

**第一刀**:react-markdown + remark-gfm(佔主包 17.1%)只有 AI 回覆在用,抽到
`MarkdownBody.tsx` 由 `ReplyText` lazy 載入。fallback 顯示原始文字而非空白。
`MarkdownBody` 檔頭註明不得靜態 import,否則切分默默塌回主包。

**第二刀**:@font-face 佔 render-blocking CSS 88.7%,Noto Sans TC 400/500/700
三份靜態換一份 variable。**坑**:variable 版註冊的 family 是
`'Noto Sans TC Variable'` 而非 `'Noto Sans TC'`——只換 import 不改字型堆疊,CJK 會
默默 fallback 到 PingFang。`antdTheme.ts` 與 `index.css` 兩處堆疊已同步。

---

## P1 — 隨規模惡化

### P1-5 strict mode 開啟(`189149a`)

`npx tsc --strict` 實跑全庫只有 **3 個錯誤**:`useResizablePane` 的
`RefObject<T | null>` 過度寬(收斂即可、零轉型)、`ArtifactFullPageView` 的
`window.open` 需要 undefined guard(開 `/undefined` 分頁是無聲失敗,guard 有實質
價值)。修完翻開三個 tsconfig,文件改為「NEVER 關回去」。

### P1-6 query key 前綴碰撞(`c508ede`)

**根因**:內容 query 的 key `['artifacts', id, nonce]` 落在清單前綴 `['artifacts']`
底下,每次 pin/publish/share/delete 的清單 invalidate 都連帶重新下載整份 HTML。

**前置調查決定了搬法**(原標中風險的原因):`useArtifactRepair` 的 invalidate 其實
冗餘——repair 同時 bump reload nonce,新 key 必然重抓;**真正依賴前綴涵蓋的是全頁
檢視的「重新整理」按鈕**(無 nonce,invalidate 是它唯一的重抓機制),直接搬 key 會
讓它無聲失效。

**修法**:內容移到 `artifactContentQueryKey(id)` = `['artifactContent', id]`;
Refresh 與 repair 指向新前綴;publish 的 per-id invalidate 移除;零使用者的
`artifactQueryKey` 連同腐化註解刪除。

**回歸**:MSW fall-through tap 數 wire 請求,釘住「publish 不重新下載 HTML」
(red-capable:舊行為 expected 3 to be 2)。

### P1-7 live-run 三重資料團塊(`136411a`)

同組欄位存三份形狀:`AgentStreamState` → 手寫 `LiveRun` → MessageBubbleProps 的
19 props 中 14 個;ThreadPanel 手抄 12 欄。收攏:`LiveRun` 改為
`Pick<AgentStreamState, …>` 並搬到 MessageBubble(契約擁有者);ThreadPanel 直接遞
state;MessageBubble 九個 live-only props 收成單一 `live?: LiveRun`。**歷史泡泡的
扁平 props 一個沒動**,P0-1/P0-2 的 memo 邊界不受擾動,stream-perf probe 全程當
護欄。

### P1-8 handlers.ts 750 行拆五檔(`75a325b`)

messages(含 SSE 引擎)366、artifacts 205、sessions 112、files 88、config 18,
index 20 行只組裝。跨模組循環 import 全部只在 handler 執行期取用,ESM 下惰性
安全,每檔開頭註明。純搬移零行為變更。

### P1-9 測試序列牆 110s → 30s(`bf2e0f2`)

`fileParallelism: false` 的理由「全平行餓死 suspense 等待」**只在每核一個 worker
的無上限平行成立**;有界池實測:2 workers 58/57s、4 workers 30.41/30.42/30.37s,
五輪 261 測全綠零 flake。採 `maxWorkers: 4`;flake 時先降 worker 數,不要關平行。

### P1-10 / P2 / 尾巴(`4c0f3b2`)

- `@ant-design/x` 移除(bundle 本來就 tree-shake 掉,純依賴衛生)
- QueryClient 明訂 `retry: 1`(suspense 失敗原本 7–15s 才到 ErrorBoundary)
- `useAgentStream` 雙重 invalidate 收成單次前綴,測試升格為連次數一起釘
- `clamp` 抽到 `utils/`、三處雙 import 合併、StudioShell hooks 順序、
  ResizeHandle 的 drag callbacks 收緊為必傳
- 兩處「share/delete 停用中」過時測試註解、三處懸空「ADR status note」引用、
  `artifactUrl` 註解的不完整清單
- **刻意跳過**:版本釘法不一致(lockfile 兜底,低痛)

---

## 過程中的方法論教訓

1. **wrapper 計數驗不了 memo 的存在**——wrapper 自帶 memo 邊界,兩態皆綠。驗
   「export 是否被 memo 包住」只能直接看 `$$typeof`。
2. **未 commit 時的 red-capable 還原要用 `git stash`,不能用 `git checkout --`**
   ——後者退到 HEAD,曾短暫重新引入已刪除的 export,4 個測試逾時,還被併發測試的
   CPU 爭用假象掩蓋了一輪。
3. **msw 的 `passthrough()` 是打真網路**(node 下直接掛住);要落到下一個 handler
   是回 `undefined`。
4. **純搬移必須逐字**——multipart parser 第一版憑印象重寫,diff 抓到變數名、size
   計算、regex 大小寫全漂了;之後一律 sed 切片原文組裝。

## 需人工驗證(jsdom 驗不到)

- [ ] 長回覆串流時打字是否還掉幀(deferral 實效)
- [ ] 中文字重呈現(Noto Sans TC variable 的 500/700 是插值)
- [ ] 第一則 markdown 回覆出現瞬間的 fallback 是否無感(lazy chunk)

## 已記錄、未處理

- mock 的 share 仍回 501 NOT_IMPLEMENTED,真後端已上線——mock 保真落後
- `ThreadPanel` 的 `runEndedVisibly` 邏輯未動(不在審查清單內)
