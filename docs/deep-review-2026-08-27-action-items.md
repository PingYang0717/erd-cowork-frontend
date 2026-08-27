# 深度審查行動項目（P0/P1）— 待逐項確認

日期：2026-08-27。來源：`docs/deep-review-2026-08-27-perf-maintainability.md`（四軸平行
深度審查的彙整報告）。本文件把該報告的 P0／P1 發現攤成**逐項待決清單**，每項記錄：
問題、影響、解法、狀態。狀態由使用者逐一確認後回填（`待確認` / `核准修改` /
`暫緩` / `已修改`）。

不含 P2（衛生類，另外處理）。

---

## P0（實際使用者會有感或直接故障）

### P0-1　上傳把整份檔案載進記憶體，還雙倍複製

**位置**：`src/api/fileApi.ts:11-38`

**問題**：`buildMultipartBody` 用 `await file.arrayBuffer()` 把每個檔案整份讀進
JS heap，再配一塊同尺寸的 `Uint8Array` 把所有 chunk 複製進去組成單一 body。專案
自訂上限是 5 檔共 5GB（單檔 CSV 上限 2GB）；照這個路徑，尖峰記憶體是**檔案大小
的兩倍**——一個 2GB CSV 就需要 4GB+ heap，瀏覽器分頁在 `send()` 之前就可能
OOM 崩潰，且崩潰無聲無息，使用者只看到分頁死掉。手組 body 的原始理由是「undici
的 fetch 會對 jsdom 的 File 做 brand-check、測試裡序列化成空 blob」，但這條路徑
用的是 **XHR 不是 fetch**，這個理由不成立——是測試環境的 workaround 污染了
prod code。

**解法**：改用瀏覽器原生 `FormData`：

```ts
const formData = new FormData();
for (const file of files) formData.append('files', file, file.name);
request.send(formData);
```

瀏覽器自己從磁碟串流、自己設 boundary（刪掉手動 `Content-Type`）；
`upload.onprogress` 的 `lengthComputable` 對 FormData 依然為 true，進度條不受影響。
若某個測試因 jsdom 的 FormData 序列化行為而壞掉，shim 放在 `src/test/setup.ts`，
不動 prod code。

**狀態**：待確認

---

### P0-2　單一 1.3MB JS chunk，零 code splitting

**位置**：`src/app/router.tsx:3-7`、`vite.config.ts`

**問題**：所有頁面（Studio、Artifacts 總覽、Schedule、全頁 Artifact 檢視）都是
靜態 import，全 src 沒有一個 `React.lazy`（AGENTS.md 本來就規定獨立路由要用
`React.lazy`）；`vite.config.ts` 沒有任何 chunk 切分策略。實測 build 產物是一顆
1,299kB（gzip 412kB）的 JS。影響兩層：(1) 首載——進 `/cowork` 的人也把 Gallery、
Schedule、全頁檢視、react-markdown 的整個解析器一起載了；(2) 更新成本——antd
（chunk 大宗）、react-dom、router 跟 app code 全部熔在同一顆 chunk，**任何一行
app 修改都會讓整顆 chunk 的 hash 改變**，內部工具部署頻率高，等於每次部署都要
全體使用者重新下載 412kB。

**解法**：兩步。(1) Route-level lazy：Gallery/Schedule/ArtifactPage 改
`React.lazy(() => import(...))`，掛在既有 `SuspenseLoader` 下。(2) Vendor
split：`vite.config.ts` 加 chunk 策略，至少切三塊——
`antd + @ant-design/icons`、`react + react-dom + react-router`、
`react-markdown + remark-gfm`。vendor 幾乎不動，hash 穩定，之後部署使用者只需
重載 app chunk（預估 <100kB gzip）。加碼：`ConnectorsPanel`、`ShareArtifactDialog`
是點了才開的 dialog，也適合 lazy。

**狀態**：待確認

---

### P0-3　字體佔掉 95% 的 render-blocking CSS

**位置**：`src/main.tsx:4-6`

**問題**：`@fontsource/noto-sans-tc` 用了三個**靜態**字重（400/500/700）。每個
字重被切成 ~102 個 unicode-range 子集 × woff2 + legacy woff 兩種格式，dist 裡
產出 **15.2MB、616 個字體檔**；437kB 的 CSS 裡有 387kB 是 `@font-face` 樣板——
render-blocking CSS 的 gzip 167kB 裡，真正的樣式只有 8kB。附帶一個實際 bug：
source 有 24 處 `font-weight: 600`，但沒有出對應的 TC 600 字面，瀏覽器現在是
合成粗體或就近字重頂替，semibold 效果是假的。

**解法**：換成可變字重版本：

```ts
import '@fontsource-variable/noto-sans-tc';
```

CSS 降到約 10-15kB gzip；dist 字體縮約 3 倍（~5MB）、少 400+ 檔；可變字體天然
涵蓋 600，合成粗體 bug 一併解決。unicode-range 子集機制不變，瀏覽器仍只抓頁面
實際用到的 TC 字塊，內網 self-host 前提不受影響。

**狀態**：待確認

---

### P0-4a　MessageList 的 inline artifact 物件破壞 memo，串流時每 token 重 parse 所有歷史泡泡

**位置**：`src/components/chat/MessageList.tsx:162-166`

**問題**：`MessageBubble` 有 `React.memo`，但 MessageList 每次 render 時是這樣傳
`artifact` prop 的：

```tsx
artifact={ message.artifactId ? { artifactId: ..., title: ... } : null }
```

這是一個每次 render 都重新建立的物件，identity 永遠不同，`React.memo` 因此
形同虛設。而 SSE 串流時，**每個 token 事件都會讓 MessageList 整個 re-render**。
結果是：每個帶 artifact 的歷史泡泡（幾乎每個 AI 回合都有）在每個 token 事件時
都重跑一次 `splitAnswerByTableMarkers`（整段正則掃描）＋ ReactMarkdown 對
**已經定稿的回覆文字**做完整重新解析。成本＝O(帶 artifact 的回合數 × 回覆長度)
**乘上**每一個 token 事件。一個 10 回合的對話串、30 token/s 的串流速度，光這一項
就可能吃光一個 frame 的預算，肉眼可見卡頓。這也是拖曳分隔線時每個 mousemove
都會觸發的成本來源之一（見 P1-9）。

值得說明：這是歷史訊息列**唯一**的 memo 破口——`steps`/`question` 走的是
已經 memoized 的 `parsedHistory`，`onPickArtifact` 是穩定的 zustand setter
identity，其他 props 都乾淨。

**解法**：把 artifact 物件的建構併進既有的 `parsedHistory` useMemo（同樣以
`messages` 為依賴 key），而不是在 JSX 裡即時建構：

```ts
const parsedHistory = useMemo(() => messages.map((m) => ({
  steps: ...,
  question: ...,
  artifact: m.artifactId
    ? { artifactId: m.artifactId, title: m.artifactTitle ?? ... }
    : null,
})), [messages]);
```

改完後，整條歷史訊息列在串流期間完全安靜（不會因為別的訊息在串流而重渲染）。

**狀態**：待確認

---

### P0-4b　SSE 事件無節流，加上 liveText 每 token 全量重新解析成 markdown

**位置**：`src/hooks/useAgentStream.ts:225`、`src/components/chat/ReplyText.tsx:17`

**問題**：後端每送一個 SSE 事件（TOKEN/THINKING/CODE），前端就各自獨立
dispatch 一次 reducer action，沒有任何合併／節流機制。渲染頻率因此直接跟著
後端的 token 推送速率走——後端推得越快，React re-render 越密集。更嚴重的是，
每次 render 時，`ReplyText` 都要把**目前為止累積的完整 liveText 字串**重新丟給
ReactMarkdown 解析一次（因為每個新 token 都是把 delta 接到已有文字後面，整段
文字每次都要重新從頭 parse）。這代表：處理第 N 個 token 的成本是 O(目前累積
文字長度)，整個回覆跑完的總成本是 O(n²)（n = 回覆總長度）。對短回覆感覺不到，
但長回覆（例如分析報告）接近尾聲時會有真實可感的卡頓。

**解法**：把 TOKEN/THINKING/CODE 這類高頻、只是「累加內容」的事件先積在一個
ref 裡，改成每個 `requestAnimationFrame` 才 flush 一次合併後的 dispatch：

```ts
pendingDeltasRef.current.push(event);
rafRef.current ??= requestAnimationFrame(() => {
  dispatch({ type: 'EVENT_BATCH', events: pendingDeltasRef.current.splice(0) });
  rafRef.current = null;
});
```

這把 render 頻率封頂在 60/s，且與後端的 token 推送速率完全脫鉤——不管後端多快，
畫面更新頻率不變。下游所有成本（markdown 重新解析、reflow、自動捲動）都等比例
縮小。STEP/ARTIFACT/QUESTION 這類低頻、狀態轉移型的事件維持即時 dispatch，
不受影響。

**狀態**：待確認

---

## P1（隨規模明顯惡化，建議近期處理）

### P1-5　Query key 前綴碰撞，pin/publish 會重抓所有掛載中的 artifact HTML

**位置**：`src/hooks/useArtifacts.ts:5`（`artifactsQueryKey = ['artifacts']`）
對照 `src/hooks/useArtifactContent.ts:24`（`['artifacts', id, theme, nonce]`）

**問題**：TanStack Query 的 `invalidateQueries({ queryKey: ['artifacts'] })`
是**前綴匹配**，不是精確匹配。`['artifacts']` 是 `['artifacts', id, theme,
nonce]` 的前綴，所以任何一次 pin/publish/unpublish（`useArtifactMutations.ts`）
都會把**所有目前掛載中、已經抓過完整 HTML 內容的 artifact 查詢**一起判定為
過期並重新抓取——使用者只是點了一下 pin，卻觸發了背景重新下載可能是好幾 MB
的 artifact HTML。`['sessions']` 是同樣的形狀問題：跑完一輪對話會 invalidate
`['sessions']`，這會把 `useSessionDetail` 原本設計成 `staleTime: Infinity`
的防護機制打穿（那個防護是刻意的：session detail 不該無端重抓），甚至可能對
一個還沒被後端 upsert 的草稿 session 觸發 404 重抓——這正是 `useSessionDetail`
註解裡警告過的失效模式。

**解法**：把清單查詢和單體查詢的 key root 分開，不要共用前綴：

```ts
// Before: ['artifacts'] / ['artifacts', id, theme, nonce]
// After:
const artifactsListQueryKey = ['artifacts', 'list'] as const;
const artifactQueryKey = (id: string) => ['artifact', id] as const;
```

`sessions` 同理分成 `['sessions', 'list']` / `['session', id]`。改動集中在
兩個 queryKey 常數定義與各處的 invalidate 呼叫點，既有測試會立刻抓到任何
漏改的地方。

**狀態**：待確認

---

### P1-6　QueryClient 使用全預設參數，切分頁與失敗重試都過度積極

**位置**：`src/app/providers.tsx:8`（`new QueryClient()`，沒有 defaultOptions）

**問題**：TanStack Query 的預設值是為通用場景設計的，不一定適合這個產品：
`staleTime: 0` 代表資料一取回就立刻被視為過期；`refetchOnWindowFocus: true`
代表使用者每次切回這個分頁（例如從別的分頁切回來），所有目前畫面上的查詢
都會重新抓一次——包含可能是好幾 MB 的 artifact HTML；`retry: 3` 代表任何
失敗的請求會自動重試到第 4 次才放棄，對一個正在上傳大檔或抓取大型內容而逾時
的請求，等於讓使用者多等 3 倍的失敗時間。

**解法**：在 QueryClient 建構時設定更保守的預設：

```ts
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});
```

內部工具的資料不是金融行情等級的秒級易變資料，30 秒的 staleTime 完全合理；
關掉 focus 自動重抓可以把背景流量削掉一個量級；retry 降到 1 次讓失敗回饋更快。
個別查詢仍可在自己的 `useQuery` 呼叫裡覆寫這些預設。

**狀態**：待確認

---

### P1-7　網路瞬斷後不會補抓資料，導致使用者被誤導重複送出

**位置**：`src/hooks/useAgentStream.ts:246-249`

**問題**：目前的邏輯是：使用者主動按下「停止」（abort）之後，前端會排程
兩段延遲的 invalidate，去追後端非同步落庫的結果。但如果是**網路瞬斷**（不是
使用者主動停止），前端只是把狀態標記成 DISCONNECTED、顯示「連線中斷，請重新
送出一次」，**完全不會觸發任何 invalidate**。問題是：後端很可能已經在瞬斷前
就把這一輪跑完並存進資料庫了，只是回應沒能傳回瀏覽器。使用者照著提示重新
送出，就是在對已經有答案的問題再問一次，造成重複的 run（浪費運算資源，也
可能讓對話串出現兩份幾乎一樣的回覆）。

**解法**：讓 DISCONNECTED 分支套用跟 abort 分支相同的兩段延遲 invalidate
邏輯——連線斷了不代表後端沒做完，補抓一次歷史紀錄，讓畫面有機會發現「其實
已經有答案了」。改動量很小（幾行），是複用既有邏輯而非新寫一套。

**狀態**：待確認

---

### P1-8　ChatComposer 沒有包 React.memo，導致整個輸入區在串流時每個 token 都重渲染

**位置**：`src/components/chat/ChatComposer.tsx`

**問題**：`ThreadPanel.tsx` 裡有一段註解，明確寫著把 `handleSend` 包成
`useCallback` 是「為了不打破 composer 的 memoisation」——但實際檢查
`ChatComposer` 的匯出，它**根本沒有包 `React.memo`**。這代表那段 useCallback
的保護完全沒有實際效果：composer（裡面有 antd 的 Dropdown 選單、可自動調整
高度的 TextArea、檔案上傳 modal、Connectors 面板、5 個快速指令按鈕）會在
**每一個 SSE token 事件**造成的 ThreadView re-render 時跟著整個重新渲染一次，
即便它接收到的所有 props 其實都是穩定值（沒有任何一個因為串流而改變）。

**解法**：把元件匯出包上 `React.memo`：

```tsx
export default React.memo(ChatComposer);
```

因為所有傳入的 props 已經是穩定 identity（`handleSend` 已經是 useCallback、
`sessionId` 是字串、`disabled`/`isStreaming` 是布林），這是一個沒有副作用、
立即生效的修改。

**狀態**：待確認

---

### P1-9　拖曳三欄版面的分隔線時，每個滑鼠移動事件都重渲染整棵應用樹

**位置**：`src/hooks/useHorizontalDrag.ts:16-19`、
`src/components/layouts/StudioLayout.tsx:27`、
`src/components/layouts/StudioShell.tsx:54`

**問題**：`useHorizontalDrag` 在處理拖曳時，每收到一個 `mousemove` 事件就直接
呼叫 store 的 setter（`setThreadWidth`／`setSessionRailWidth`），沒有任何節流。
一般滑鼠的移動事件頻率可以到幾百 Hz，電競滑鼠甚至到 1000Hz——也就是說拖曳
一次分隔線，可能觸發幾百到一千次的 store 寫入。而 `StudioLayout`／
`StudioShell` 底下的子元件（`ThreadPanel`、`ArtifactPanel`、路由的
`<Outlet/>`）都沒有包 memo，所以每一次 store 寫入都會讓**整個三欄版面樹**
重新 reconcile 一次。如果同時疊加 P0-4a 的問題（歷史泡泡的 markdown 重
parse），拖曳分隔線時甚至會連帶讓聊天內容重新解析——這是實際可以感受到的
拖曳卡頓/掉幀。

**解法**：兩層修法可以疊加。(1) 在 `useHorizontalDrag` 的 `onDrag` callback
內用 `requestAnimationFrame` 合併多次 mousemove，把 store 寫入頻率封頂在
60Hz。(2) 把 `ThreadPanel`／`ArtifactPanel` 包上 `React.memo`，或者更進一步：
拖曳過程中先用 CSS 變數／ref 直接改變寬度（不經過 React state），只有在
`mouseup`（放開滑鼠）那一刻才把最終寬度寫進 store——這樣拖曳過程完全不觸發
React 渲染，只有最後一次真正的狀態提交。

**狀態**：待確認

---

### P1-10　TypeScript strict mode 目前沒開，但實測開了也是零錯誤——建議直接開啟

**位置**：`tsconfig.app.json`、`tsconfig.test.json`、`tsconfig.node.json`；
`AGENTS.md`／`architecture.md` 裡「TypeScript 6（先不開 strict）」的敘述

**問題**：專案文件目前記載「先不開 strict」，暗示這是一個技術債、需要之後
排時間清理。但實際驗證（跑 `tsc --noEmit --strict` 針對三個 tsconfig）發現：
**現有程式碼今天套用 strict mode 完全零錯誤**，prod 程式碼裡也沒有任何一處
用 `any` 逃避型別檢查。也就是說，目前的「債」不是已經欠下的違規，而是「因為
沒開這個旗標，所以完全沒有東西擋住未來的第一個違規」——是一個預防性措施
被誤記成了清理型技術債。

**解法**：直接在三個 tsconfig 各加一行 `"strict": true`，並把 AGENTS.md／
architecture.md 裡「先不開 strict」的敘述拿掉（連文件一起同步，避免文件與
現況再度脫節）。因為現況零違規，這個改動預期不會產生任何新的編譯錯誤，是
全份清單裡**成本最低、長期回報最高**的一項——它不修任何現有問題，而是把
現在乾淨的狀態鎖住，防止未來劣化。

**狀態**：待確認

---

### P1-11　測試套件的 CI 執行時間會隨功能數量線性成長，且 mock 層集中在單一大檔

**位置**：`vite.config.ts:17-23`（`fileParallelism: false`）、
`src/mocks/handlers.ts`（766 行）

**問題**：測試設定裡關掉了檔案間平行執行（`fileParallelism: false`），原因
寫在註解裡：因為每個測試檔案都會先 suspend（`useSuspenseQuery`），如果讓
24 個檔案同時跑，彼此會互相餓死排隊中的非同步操作，導致單獨跑會過的測試在
整批跑時失敗——這是一個經過驗證、有效的修復，**不建議推翻**。但代價是：
目前 47 個測試檔案序列執行需要 105 秒，而且這個時間會隨著功能數量線性成長
（O(功能數)）；推算到 100 個檔案時，CI 單次跑測試可能要接近 4 分鐘。另外，
`src/mocks/handlers.ts` 這一個 766 行的檔案同時服務全部 47 個測試檔案的 mock
需求，是一個典型的「多個不相關原因共用同一個檔案」的結構（Divergent Change
的前兆）——目前只有少數測試會用 `server.use()` 覆寫特定 handler，但檔案本身
已經大到不容易快速定位。

**解法**：分兩步，互不衝突。(1) 保留 `fileParallelism: false` 這個修復（它
解決的是真實的 race condition），改在 **CI 層面**用 `vitest --shard=1/3`
之類的參數切成多個平行 job，每個 shard 內部仍然序列執行（餓死問題的修復
仍然有效），但整體 wall-clock 時間隨 shard 數量下降。(2) 把 `handlers.ts`
按照現有的資源分類（`persistedResource` 已經是按 session/artifact/connector
等分開管理的），拆成 `src/mocks/handlers/{sessions,artifacts,agent,
connectors}.ts` 幾個檔案，再由原本的 `handlers.ts` 統一 re-export——這是
純粹的檔案搬遷，不改變任何測試行為。

**狀態**：待確認

---

### P1-12　MessageBubble 有 19 個 props，其中約 10 個其實就是已存在的 LiveRun 型別

**位置**：`src/components/chat/MessageBubble.tsx:33-66`，對照
`src/components/chat/MessageList.tsx:14`（`LiveRun` 型別定義）

**問題**：`MessageBubble` 目前接收 19 個 props，其中 `streaming`、`stopped`、
`networkError`、`thinking`、`codeText`、`tables`、`error`、`timerStartedAt`、
`question`、`artifact` 這約 10 個，逐一比對後發現**跟 `LiveRun` 這個型別的
欄位幾乎一一對應**——而 `LiveRun` 這個型別本身已經存在於 `MessageList.tsx`
裡，用來描述「目前正在串流中的這一輪」。換句話說，「這些欄位應該被組成一個
型別」這個判斷已經被做出來了，只是這個型別的誕生**在 MessageBubble 這一步
停住了**——MessageList 組好 `LiveRun` 物件後，又把它拆散成 10 個獨立 props
傳給 MessageBubble。這是一個 Data Clump 的教科書案例：這幾個欄位總是一起
出現、一起變化，卻沒有被當成一個整體傳遞。實務上的壞處是：未來每新增一種
串流狀態（例如新的事件類型），都要同時修改三個地方——型別定義、
MessageList 的組裝、MessageBubble 的 props 列表與內部邏輯。

**解法**：讓 `MessageBubble` 直接接收 `live?: LiveRun`（或設計一個
`Turn = Settled | Live` 的 union type 更精確地表達「這是歷史訊息還是進行中
的訊息」），MessageList 本來就已經在組裝這個物件，只是要把組裝完的物件直接
傳下去，而不是拆開再傳。這個修改最好安排在 P0-4a 修完之後做，因為兩者會
動到同一段程式碼，一次改完比較乾淨。

**狀態**：待確認

---

### P1-13　`@ant-design/x` 套件已安裝但整個專案零使用

**位置**：`package.json:18`

**問題**：`package.json` 的 dependencies 裡列了 `@ant-design/x`，但搜尋整個
repo 找不到任何一處 import 它。這代表它目前只有安裝成本（`npm install` 變慢、
`npm audit` 要多掃一個套件的已知漏洞）跟沒有實質效益，而且是一顆潛在的
「bundle 地雷」——如果之後有人不小心 `import` 了它其中一個元件（例如以為
專案已經在用、想沿用既有依賴），可能會不知不覺讓 bundle 體積增加數百 kB
而不自知。

**解法**：`npm uninstall @ant-design/x`。這是零風險的清理——沒有任何程式碼
依賴它，移除後 `tsc`／測試／build 都不會受影響。

**狀態**：待確認

---

### P1-14　Connector 的連線/斷線 mutation 沒有錯誤處理，localStorage 寫入失敗會靜默消失

**位置**：`src/hooks/useConnectorMutations.ts`

**問題**：Connector 的偏好設定（連線哪些資料來源、新增的自訂來源）目前是
寫進 `localStorage`（這是先前一輪對接工作中做的決定：後端這次沒有 connector
端點，所以偏好留在瀏覽器本地）。但目前的 mutation hook 沒有 `onError`
處理——如果 `localStorage.setItem` 因為容量已滿（部分瀏覽器對單一網站的
localStorage 有幾 MB 的上限）或使用者開著瀏覽器的隱私/無痕模式（Safari 的
無痕模式對 localStorage 寫入有特殊限制）而擲出例外，這個錯誤會被吞掉、沒有
任何提示。使用者體感是：點了「連線」，畫面看起來成功了，但重新整理頁面後
偏好卻消失了，而且完全不知道發生了什麼事。

**解法**：比照這次對接工作中 session／artifact mutation 已經採用的模式——
加上 `onError`，透過 `describeActionError` 產生的訊息以 toast 告知使用者。
同時，這個 toast 邏輯（`useActionErrorToast`）目前在 `useSessionMutations.ts`
和 `useArtifactMutations.ts` 兩個檔案裡幾乎逐字重複，這次一併抽成一個共用的
hook（例如 `src/hooks/useActionErrorToast.ts`），三處一起收斂，避免將來改
錯誤訊息格式時要同步改三個地方。

**狀態**：待確認

---

## 使用方式

逐項回覆「修改」或「暫緩」（或直接說「全部照建議做」）。核准後我會依報告
建議的批次順序（P0 全部 → P1 依相依關係）動工，每個修改都會有對應的
commit，且不影響既有的 237 個測試。
