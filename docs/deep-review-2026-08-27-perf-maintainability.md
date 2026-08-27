# 深度審查報告 — 效能與可維護性（fix/button-dropdown-style）

日期：2026-08-27。動機：產品將服務大量使用者，對效能與可維護性要求提高。
四個獨立 sub-agent 平行深挖：React 渲染效能／網路·資料·記憶體／可維護性·架構／
Bundle·建置。嚴重度：**P0**＝實際使用者會有感或直接故障、**P1**＝隨規模明顯惡化、
**P2**＝衛生。

## 總覽（跨軸彙整，依修復優先序）

| #   | 嚴重度 | 發現                                                                                                                                                                                                                                                                                        | 位置                                                        | 影響                                                |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| 1   | P0     | GB 級上傳整包載入記憶體（且雙倍複製）——手組 multipart 用 `file.arrayBuffer()`；上限 5 檔 5GB 時峰值 ~10GB heap，分頁 OOM。手組理由（undici fetch 測試怪癖）不適用於 XHR 路徑                                                                                                                | `api/fileApi.ts:11-38`                                      | 真實上傳直接弄死分頁                                |
| 2   | P0     | 單一 1.3MB JS chunk（412kB gzip），全 src 零 `React.lazy`、無 vendor split——每次部署所有使用者重載全量                                                                                                                                                                                      | `app/router.tsx:3-7`、`vite.config.ts`                      | 首載與每次更新都慢                                  |
| 3   | P0     | 字體 CSS 佔 95%（167kB gzip render-blocking）：三個靜態 Noto TC 字重 ×102 子集 ×2 格式＝15.2MB/616 檔；且 24 處 `font-weight:600` 沒有對應 TC 字面                                                                                                                                          | `main.tsx:4-6`                                              | 首載阻塞；600 字重是合成的                          |
| 4   | P0     | 串流渲染風暴（a）`MessageList.tsx:162-166` inline `artifact={{...}}` 破 memo→每 token 對每個帶 artifact 的歷史泡泡整段 ReactMarkdown 重 parse；（b）SSE 每事件一 dispatch 無節流＋liveText 每 token 全量重 parse＝O(n²)                                                                     | `MessageList.tsx`、`useAgentStream.ts:225`、`ReplyText.tsx` | 長回覆後段可見卡頓                                  |
| 5   | P1     | Query key 前綴碰撞：`['artifacts']` 是 `['artifacts', id, theme, nonce]` 的前綴——每次 pin/publish 重抓**所有掛載中 artifact 的完整 HTML**；`['sessions']` 同型，跑完一輪打爆 `staleTime: Infinity` 防護並可能對草稿 404 重抓                                                                | `useArtifacts.ts:5`、`useArtifactContent.ts:24`             | 換 root：`['artifacts','list']`/`['artifact',id,…]` |
| 6   | P1     | QueryClient 全預設：`staleTime:0`、`refetchOnWindowFocus:true`、`retry:3`——每次切回分頁重抓全部含 artifact HTML；大檔失敗重試 4 次                                                                                                                                                          | `app/providers.tsx:8`                                       | 內部工具建議 30s/false/1                            |
| 7   | P1     | 斷線路徑不 invalidate：後端已完成的 run 畫面看不到，使用者被叫重送→重複 run                                                                                                                                                                                                                 | `useAgentStream.ts:246-249`                                 | DISCONNECTED 也排兩段 invalidate                    |
| 8   | P1     | `ChatComposer` 未 memo（ThreadPanel 註解假設它有）——每 token 重渲染整個 composer                                                                                                                                                                                                            | `ChatComposer.tsx:258`                                      | 包 `React.memo`                                     |
| 9   | P1     | 拖曳分隔線每 mousemove 寫 store→整棵三欄樹 reconcile（1000Hz 滑鼠＝1000 次/秒）                                                                                                                                                                                                             | `useHorizontalDrag.ts:16-19`                                | rAF 節流＋memo 兩 panel 或 CSS 變數                 |
| 10  | P1     | **strict mode 債是迷思**：三個 tsconfig 開 `--strict` 今天就是零錯誤、prod 零 `any`——唯一的債是「沒開旗標擋住未來違規」                                                                                                                                                                     | `tsconfig.*.json`                                           | 一行改動，最高 ROI                                  |
| 11  | P1     | 測試 CI 軌跡：47 檔 105s 序列跑，O(features) 成長；`handlers.ts` 766 行單檔服務全部測試                                                                                                                                                                                                     | `vite.config.ts:17-23`（註解已過時「24 files」）            | CI shard＋handlers 按資源拆檔                       |
| 12  | P1     | `MessageBubble` 19 個 props，其中 ~10 個就是已存在的 `LiveRun` 攤平——type 已誕生只差最後一步                                                                                                                                                                                                | `MessageBubble.tsx:33-66`                                   | 收成 `live?: LiveRun`                               |
| 13  | P1     | `@ant-design/x` 列在依賴、全 repo 零 import                                                                                                                                                                                                                                                 | `package.json:18`                                           | 移除                                                |
| 14  | P1     | `useConnectorMutations` 缺 onError；localStorage quota 失敗靜默（前次 review 已列，尚未修）                                                                                                                                                                                                 | `useConnectorMutations.ts`                                  | 補 onError                                          |
| 15  | P2     | 假 Directory stub（真人樣貌的名單）進 prod bundle，`canShare: true` 時可達                                                                                                                                                                                                                  | `artifactApi.ts:8-40`                                       | 拔掉或閘住                                          |
| 16  | P2     | sseParser 只認 `\n\n`——後端吐 CRLF 時整輪 buffer 到 flush 才倒出                                                                                                                                                                                                                            | `utils/sseParser.ts:36`                                     | `/\r?\n\r?\n/`                                      |
| 17  | P2     | axios 10s timeout 蓋到大型 artifact HTML 下載；HtmlCodePanel raw HTML 放元件 state 無 dedupe；drag 中途 unmount 漏 listener；per-browser-profile 身分共用機器互撞（v1 已知）；auto-scroll effect 吃不穩定 identity；`onSubmit` noop 每 render 新 identity（潛在）；306 個 legacy .woff 死重 | 各處                                                        | 各自小修                                            |
| 18  | P2     | 文件漂移 6 處：`artifactApi.ts:84` 註解為假、`interface.md:43-51` 仍記 PATCH pinnedAt/停用、checklist 表格自相矛盾、`SessionList.tsx:54-55` 疊置矛盾註解、`architecture.md` §1 列已刪除的 api 模組、`artifact.ts:21` 用已除名詞彙                                                           | 各處                                                        | 一批清完                                            |
| 19  | P2     | 死面：`createSession`、`sortByRecency` export                                                                                                                                                                                                                                               | `sessionApi.ts:14`、`useSessionGroups.ts:12`                | 刪                                                  |

## 做得好的（四軸一致認可，不要動）

- 深模組典範：`sseParser`（feed/flush 藏 chunk 邊界）、`streamAgentMessage`
  （AsyncGenerator 藏 fetch/reader/abort）、`planFileAdditions`、`tableMarkers`、
  `liftQuestions`（自述其失真）、`deriveArtifactVersions`——皆純函式、有測試、註解講
  invariant 不講機制
- `parsedHistory` memo、ResultTable 的穩定 identity（≤200 列不隨 token 重渲染）、
  ArtifactFrame 的 securedHtml memo＋theme 不進 iframe key＋`keepPreviousData`、
  zustand 全面 per-field selector、捲動位置用 ref
- abort 生命週期乾淨（agentApi reader.cancel、HtmlCodePanel AbortController、
  各 listener/interval cleanup）
- 7 個 store 各有書面 rationale，粒度正確；pick > streamed > newest 不是 tribal
  knowledge（但建議抽 `resolveActiveVersion` 純函式讓 invariant 可執行）
- MSW 嚴格 test-only、dist 未進 git、無 prod sourcemap、antd 逐元件 named import
  可搖樹、self-host 字體符合內網封鎖前提
- 測試脆度中等而有防護：後端持有字串集中在 `constants/messages.ts`

## 建議修復批次

- **批次一（P0，上線前必修）**：#1 FormData 化上傳（測試怪癖改在 setup shim）→
  #2 route lazy＋vendor split → #3 Noto TC 換 variable 字體 → #4a MessageList
  artifact 進 memo → #4b SSE rAF 批次 dispatch
- **批次二（P1，一週內）**：#5 query key root 分離、#6 QueryClient defaults、
  #7 斷線 invalidate、#8/#9 composer memo＋drag 節流、#10 開 strict、#13 移除
  @ant-design/x、#14 connector onError
- **批次三（P1/P2，排程）**：#11 CI shard＋handlers 拆檔、#12 MessageBubble 收
  LiveRun、#15–#19 衛生與文件批
