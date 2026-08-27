# `feat/align-interfact` — 與 cowork 的介面與流程對齊

分支基準：`master@11933cb`　·　期間：2026-08-27　·　7 顆 commit
`65 files changed, 2628 insertions(+), 614 deletions(-)`
測試：184 → **228 passed（43 files）**，lint 與 `tsc -b` 乾淨。

對齊對象是 [`Michelle12369/cowork`](https://github.com/Michelle12369/cowork)——本專案的
base，且已實際串接後端。目標是**用法與行為對齊**，不是把本專案的領域功能砍掉遷就它。

契約層的型別在 [ADR-0007](../adr/0007-verbatim-backend-wire-contract.md) 已經逐字一致，
所以這一輪處理的全部是**使用方式**與**操作流程**。

---

## Commit 一覽

| #   | Commit                  | 主題                                        |
| --- | ----------------------- | ------------------------------------------- |
| 1   | [`815bf18`](#1-815bf18) | interface 用法對齊                          |
| 2   | [`707cfa3`](#2-707cfa3) | New chat 改為 client-side draft             |
| 3   | [`c550f9f`](#3-c550f9f) | Artifact Reload 重掛文件                    |
| 4   | [`578dd3f`](#4-578dd3f) | MessageBubble 合流：live 與 history 同一顆  |
| 5   | [`e374919`](#5-e374919) | IME 修正 + 落地就能打字                     |
| 6   | [`f90b620`](#6-f90b620) | Artifact CSP + 上傳進度 + 串流中禁用 Reload |
| 7   | [`ac395c1`](#7-ac395c1) | 檔案保留期與過期狀態                        |

前四顆來自 grill 出來的四項需求（interface / new chat / reloadNonce / chatPanel）；
後三顆來自[操作流程深度比對](../cowork-master-comparison.md#7-操作流程逐段比對ui-層)
第 7 節挖出的落差。

---

## 1. `815bf18`

**feat(api): align API usage with the cowork backend contract**

契約層，UI 行為只有修正。`9 files, +247 −17`

| 改動                                             | 為什麼                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `useSessionDetail` 加 `staleTime: Infinity`      | 草稿 session 只活在 cache 裡，任何背景 refetch 都會 404 並把對話串拆掉                                 |
| `getContent` 明寫 `responseType: 'text'`         | 一段剛好能被 parse 成 JSON 的 HTML 也要以字串抵達                                                      |
| 新增 `getRawHtml` + MSW `GET /artifacts/:id/raw` | 組裝前的 Artifact 原始碼，泡泡的「查看 HTML」要讀它                                                    |
| 新增 `utils/tableMarkers.ts`                     | 🔴 後端在回覆文字裡夾 `[[table:id]]` 指定表格位置，本專案沒有解析，**live 模式會把標記原樣印給使用者** |
| 新增 `constants/messages.ts`                     | 後端自己持久化的字串（中斷紀錄、修復紀錄），集中一處避免與字面值比對                                   |
| `useArtifactContent` 加 `keepPreviousData`       | 🔴 docstring 宣稱換 theme 時保留舊文件，實際上換 query key 就會清空 `data`，畫面會閃                   |

`[[table:]]` 的處理與 cowork 有一處刻意不同：**沒有被任何標記指定位置的表格接在文字後面，
而不是消失**。標記說的是「表格該出現在這裡」，沒有標記不代表這張表不該出現。

---

## 2. `707cfa3`

**feat(session): New chat opens a client-side draft, not a POST**

`14 files, +342 −56`　·　附 [ADR-0008](../adr/0008-new-chat-is-a-client-side-draft.md)

後端**沒有** `POST /sessions`：session id 由 client 指定，第一則訊息（或上傳）時 upsert。
原本的 New chat 打 `POST /sessions`，在 mock 模式看起來正常，在 live 模式是死路。

- New chat 產 `crypto.randomUUID()`、把空的 `SessionDetail` 殼寫進 query cache、選取它。
- 草稿由**推導**判定（「選取的 id 不在 `GET /sessions` 回來的清單裡」），第一則訊息讓它落地
  之後草稿身分自動消失，不另存狀態。
- 草稿列不提供 rename / pin / delete——那三個操作後端沒有，而且草稿還沒有東西可改。
- 草稿位置不寫特例：`updatedAt` 是被開啟的當下，recency 排序自然讓它落在 Recents 第一筆。
- 已在草稿中時再按 New chat 是 no-op，否則 cache 裡會堆沒人指向的殼。

**連帶必須改 mock**：`POST /sessions/:id/messages` 與 `POST /sessions/:id/files` 兩個寫入
端點都要 upsert（真後端就是這行為），否則草稿一送訊息或附檔，`GET /sessions/:id` 就 404 把
對話串炸掉。`test/agentStream.ts` 的 stub 也照做——它站在那個端點的位置，就要有那個端點的行為。

兩支「模擬 reload」的測試改成從既有 session 出發：草稿刻意不跨 reload 存活。

---

## 3. `c550f9f`

**feat(artifact): Reload remounts the artifact document**

`7 files, +158 −4`　·　`CONTEXT.md` 新增詞條，[ADR-0001](../adr/0001-artifact-rendered-via-sandboxed-iframe.md) 補一節

Artifact 是一段會跑自己 script 的 HTML。卡住的時候，使用者原本唯一的救命稻草是
「重新生成」——那要重跑一整輪分析，成本差好幾個數量級。

**詞彙先分家**（三者互斥，寫進 `CONTEXT.md`）：

| 詞                         | 意思                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| **Repair（修復）**         | 錯誤驅動的重產：iframe 回報 JS 錯誤 → 提議 → 使用者確認 → Agent 重產 |
| **Regenerate（重新生成）** | 使用者主動要新版本，送訊息跑一整輪，結果是**一個新版本**             |
| **Reload（重新整理）**     | 同一份 HTML 重新掛載一次，不呼叫 Agent、不產生新版本                 |

`ReloadOutlined` 這顆 icon 讓給 Reload（原本被 Regenerate 佔用），Regenerate 改 `SyncOutlined`。

**機制**：nonce 放 `useActiveRunStore`，因為它有兩個互相看不到的呼叫端——面板自己的 Reload
按鈕，以及在對話串那側完成的 Repair。修復成功時只 invalidate 不夠：那個卡住的文件還掛在畫面
上，連同讓它出錯的狀態一起。

theme 與 nonce 的意圖恰好相反，所以兩者同在 query key、但只有 nonce 進 iframe 的 `key`：

| 動作                        | iframe 是否重掛                     |
| --------------------------- | ----------------------------------- |
| 切換版本（`artifactId` 變） | 是——那是另一份文件                  |
| 切換主題（`theme` 變）      | **否**——srcDoc 在同一份文件底下換掉 |
| Reload（`reloadNonce` +1）  | 是——這正是 Reload 的意思            |

---

## 4. `578dd3f`

**feat(chat): one MessageBubble for the live turn and the history one**

`19 files, +1057 −494`　—— 本分支最大的一顆。

history 與串流中的 run 原本走兩個不同元件（`MessageBubble` / `LiveRunView`），所以一輪跑完的
交棒是「兩個必須靠人工維持相像的東西」之間的切換。現在是同一顆元件、同一組扁平 props，交棒
在結構上就看不出來。

**視覺**：AI 的一輪是**一個表面**——steps、thinking、HTML、tables、artifact chip、計時器、
結束狀態全部收進 `fillTertiary` 的圓角泡泡，而不是散在頁面上的一疊卡片。泡泡內部不再各自畫
邊框（框中框），深度改由更深一階的 `fillQuaternary` 表達。

同一顆 commit 裡連帶處理：

- **`MessageList` 接管捲動**——它擁有被追加的內容，螢幕閱讀器的 log 邊界與跟著新訊息走的
  捲動容器必須是同一個元素。deps 補上樂觀泡泡與 repair 卡（原本這兩者出現時不會捲）。
- **`RepairOfferCard` 走 `bottomSlot`** 進捲動容器——它是關於「這段對話剛產出的 Artifact」，
  當成固定列會被讀成全域警示。
- **耗時**從整串底部一行搬到該輪的泡泡上，並補上串流中的即時計時。底部那行不屬於任何訊息，
  捲上去看舊對話時還黏在最下面，語意是錯的。
- **斷線**有自己的說法，與使用者主動停止分開。
- **步驟展開條件重新定義**：一個 turn 在串流中／被停止／等待未回答的反問時都還沒結束，步驟
  維持展開；「Worked through N steps」是對一個**結束了的** turn 的陳述。
- **歷史反問卡**從 `questionsJson` 唯讀渲染——那個欄位型別裡有、先前一行都沒讀。答案沒有被
  持久化，所以卡片只能顯示當初問了什麼，顯示不出選了什麼。
- **「查看 HTML」** lazy-fetch `/artifacts/:id/raw`。
- **`ThreadView` 加 `key={sessionId}`**——`ArtifactPanel` 有、thread 沒有，所以被停止的 run
  會跟著使用者進到另一個對話。

一個實作上的岔路值得記下：反問卡的出現時機我一度照抄 cowork（串流結束才顯示），被既有測試
抓到。**本專案的行為是反問一到就顯示**——run 正在等使用者，等串流關閉是白等。已改回並註明。

---

## 5. `e374919`

**fix(chat): Enter during input-method composition no longer sends**

`6 files, +240 −25`

🔴 **這是每天都會踩到的 bug。** 一個打注音／拼音的使用者，大部分的按鍵時間都在組字狀態，
那個 Enter 的意思是「選這個候選字」。composer 把它讀成「送出」，於是半個字就被送給 Agent。

修法與 cowork 一致，並多一層保險：`compositionstart/end` 記錄狀態 + `isComposing` 標準訊號
——兩者單獨都不覆蓋所有瀏覽器與輸入法。

同一顆 commit 另外處理**落地就能打字**：原本 `selectedSessionId` 起始為 `null`，畫面停在
「Select or start a session」，必須先點一下——而那一下沒有任何決策。現在自動開最近一筆
對話，沒有就開草稿。

連帶把 **thread header 提到 suspense 邊界之外**：有 session 之後 `ThreadView` 會 suspend，
而 header（主題切換 + 資料來源 chip）當時在邊界裡面，每次載入 session 整條 header 會閃掉
（`App.test.tsx` 抓到的）。header 跟「開的是哪個對話」無關，這也比原本的結構正確。

---

## 6. `f90b620`

**feat(artifact,files): lock the artifact down, and show the upload moving**

`15 files, +317 −23`　—— 三個落差，都是不咬到就看不見的那種。

**CSP。** `sandbox="allow-scripts"` 擋掉 Artifact 伸進這個 app，但擋不掉它伸出去——一段有
bug 或惡意的文件仍然可以發網路請求，把拿到的資料一起帶走。policy 以 `<meta>` 注入（srcdoc
文件看不到 response header），並且**明寫父頁 origin**：sandbox 文件是 opaque origin，
`'self'` 匹配不到任何東西。

```
default-src 'none'; script-src <origin> 'unsafe-inline'; style-src 'unsafe-inline';
img-src <origin> data:; connect-src 'none'
```

**上傳進度。** 一份 CSV 在這裡動輒 GB 等級，而 modal 整段上傳期間什麼都不報。`fetch`
**根本無法回報上傳進度**，所以上傳改走 XHR——手組的 multipart body 沒變，`onload` 時補一次
`onProgress(100)`，因為不是每個瀏覽器都送最後一次進度事件。

（動手前先跑了一支拋棄式 spike 確認 MSW/jsdom 下 `upload.onprogress` 真的會觸發。）

**串流中的 Reload。** 畫面上那一版還在被寫，此時重掛等於把一份沒寫完的文件當成結果呈現。
面板透過 store 得知 run 是否開著——與 streamed artifact 同一條通道。

---

## 7. `ac395c1`

**feat(files): say when retention has taken a session's files**

`14 files, +291 −19`

後端在檔案閒置超過保留期後**會刪掉內容、保留那一列、標記 expired**。這個 app 一行都沒讀那
個旗標——所以檔案看起來還能用，每次送出都跑在不存在的資料上，唯一的症狀是一個沒有理由地
失敗的 run。

- `GET /api/config` 提供保留天數，而不是在前端再硬寫一份會漂移的副本。
- 過期 chip 顯示「已過期」並拿掉代表「可用」的 primary 色調。
- composer 收在一張說明保留期與該怎麼做的警告條後面，清掉那一列就恢復。
- **Repair 撞到同一堵牆**：`FILES_EXPIRED` 有自己的終局狀態——重試跑的是同一份不存在的資料，
  所以卡片說明原因並收掉「再試一次」。

測試資料以 `server.use` 覆蓋 session detail，沒有動 mock：要在 mock 裡真的模擬保留期會需要
一套時間機制，成本遠高於價值。

---

## 這一輪刻意**沒有**做的

| 項目                                            | 理由                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Quick chips 改成填入輸入框                      | 本專案帶 `scenarioKey` 直送，是 [ADR-0006](../adr/0006-scenario-drives-clarification.md) 的設計 |
| 反問改成扁平 `Question[]`                       | 本專案的 schema-driven `QuestionForm` 嚴格更強                                                  |
| 錯誤改用 toast                                  | inline 不會被錯過；本專案零 toast 是刻意的                                                      |
| 文案改成中文                                    | 既有決定，且沒有 i18n 框架。**例外**：與後端比對用的字串維持中文一字不差                        |
| Session rename / pin / delete 降級              | 是本專案的領域價值，方向是後端補上                                                              |
| Connector、Artifacts 總覽、分享、版本、深色模式 | 同上                                                                                            |
| header 的 `AttachmentsPopover`                  | 只是第二個入口，優先度低                                                                        |

## 已知仍未處理

- **Schedule 頁仍是 3 行 stub**（`src/pages/Schedule/SchedulePage.tsx`）。
- Session 的 rename / pin / delete 在 live 模式會 404——見
  [`docs/api/interface.md`](../api/interface.md)。
- 反問答案不被持久化，所以歷史反問卡顯示不出當初選了什麼。要修需要後端配合。

完整的落差清單與逐段流程比對見
[`docs/cowork-master-comparison.md`](../cowork-master-comparison.md)。
