# 設計稿 vs 現有實作 差異清單

- **設計稿**:`eRDWorkspace20260819.html`(UI/UX 提供,打包後的 React app,以靜態伺服器實際執行比對)
- **現有實作**:本 repo(`npm run dev`)
- **本次比對日期**:2026-08-25(樣式軸)。上一版為 2026-08-23,其後 ticket 14–19 與
  08-24/08-25 的 thread／streaming 批次陸續進來,原本列的樣式差異多數已在那些票裡修掉,
  因此本次把樣式軸整段重量。
- **方法**:兩邊並排實際執行,拉到同一個狀態(同一個 session、同一輪已完成的對話),
  對同一組元件以 `getComputedStyle` 逐值取樣,淺色與深色各測一次;數值差異再回頭對
  CSS Modules 逐檔核對。
- **本次涵蓋範圍**:Studio 三欄的實際畫面 —— Session 列表、thread header、對話訊息、
  steps 摺疊卡、Artifact chip、context chips、Composer、Artifact 工具列。

> 只有「樣式(Style)」一節是 2026-08-25 重新量測的結果。功能／排版／文案三節維持
> 2026-08-23 的紀錄,**本次未重新驗證**,見文末。

---

## 樣式(Style)— 本次修正

量到的每一項都已修正。「設計稿」欄是從 `eRDWorkspace20260819.html`
實際跑起來取到的 computed 值。

| 項目                   | 設計稿                                                                                 | 修正前                                           | 修正後                               | 檔案                                                       |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| **Steps 摺疊卡底色**   | `bg-container`(淺 `#fff` / 深 `#1f1f22`)                                               | `fill-quaternary`(`rgba(0,0,0,.02)` / `.03`)     | 逐值一致                             | `components/chat/MessageList.module.css` `.stepsRecap`     |
| **Steps 摺疊卡圖示**   | 左 14px 綠 check-circle(`#52c41a`)+ 右 11px chevron(收合 down／展開 up,**換圖不旋轉**) | 只有左側一個 10px 灰 chevron,無狀態圖示          | 逐值一致(綠勾 xoff 13、chevron 靠右) | `components/chat/MessageList.tsx` `StepsRecap`             |
| **Composer 外框底色**  | `bg-container`(`#fff` / `#1f1f22`)                                                     | 未設 `background` → 透明                         | 逐值一致                             | `components/chat/ChatComposer.module.css` `.composerBox`   |
| **資料來源 chip 字色** | `text-tertiary`(`.45`)                                                                 | `text-secondary`(`.65`)                          | 逐值一致                             | `components/chat/ThreadPanel.module.css` `.dataSourceChip` |
| **小元件 line-height** | `normal`                                                                               | 繼承 antd 的 1.5714,高度多 4–6px                 | 見下表                               | 同上 + `MessageList.module.css`                            |
| **左欄 nav 列字級**    | 13px                                                                                   | 13.333px(antd Button 預設)                       | 13px                                 | `components/session/SessionList.module.css` `.navShortcut` |
| **`body` font-family** | 設計稿寫在 `body` 上                                                                   | 無規則 → `lang="zh-Hant"` 讓瀏覽器給 PingFang TC | 與 `FONT_FAMILY` 對齊                | `index.css`                                                |

### line-height 造成的高度偏差(修正前 → 修正後,設計稿值)

| 元件               | 修正前 | 修正後 | 設計稿 |
| ------------------ | ------ | ------ | ------ |
| 資料來源 chip      | 27px   | 21px   | 21px   |
| Thread header 標題 | 23px   | 17px   | 17px   |
| `eRD AI` label     | 19px   | 15px   | 15px   |
| Artifact chip      | 38px   | 33px   | 34px¹  |

¹ 剩下的 1px 是兩邊 chip 內文字不同造成的,非樣式差異。

**深色模式是這批修正的主要動機**:前兩項在淺色下因為底色都接近白色而看不出來,深色下
設計稿是兩張浮起來的卡(`#1f1f22`),實作卻是糊在 `#17181c` 頁面底上的一層淺影/完全透明。

## 樣式 — 檢查後判定不需修正

| 項目                            | 情況                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New chat 鈕 padding             | 設計稿 `pad 0`,實作被 antd 帶上 `0 15px` 與 1px 透明邊框。但按鈕是滿版寬、內容置中,`height:38px` 又是固定的,**渲染結果完全相同**,加規則只是噪音。       |
| `.workingSteps`(執行中的步驟卡) | 設計稿該狀態的底色本次沒能穩定取樣到(mockup 的 run 太短),因此**沒有跟著改**。若之後確認設計稿執行中也是 `bg-container`,要一併調整以免完成前後底色跳動。 |

## 已對齊(本次逐值量測確認一致)

- **Session 列表**:New chat 鈕(h38/r9/fs13/w500/gap7)、選取中 session 列
  (淺 `#e6f4ff`+`#91caff`、深 `#111a2c`+`#15325b`,**與設計稿 token 逐字相同**)、
  群組標頭(fs11/w600/ls0.66/uppercase/`.45`)、session 時間(fs11/w400/`.45`,
  選取時不再變粗)、計數 badge、nav 列的 pad/margin/gap/radius。
- **Thread**:header(h54/pad 0 20、標題 fs14 w600)、user bubble(pad 10 13、
  r 14 14 4、fs13/1.55)、AI 內文(fs13.5/1.6)、steps 摺疊列文字(fs12.5/pad 9 12/gap 8)、
  Artifact chip(pad 8 12/r9/`fill-quaternary` +「shown right →」)。
- **Composer**:外框 r14/pad 8、textarea fs13/lh1.5/pad 6 2、context chips
  (h28/r14/fs12/`.65`/白底+border)、「+」與送出鈕 32×32。
- **Artifact 工具列**:版本 pill(h32/r8/pad 0 11/fs12.5)、生成 Artifact 鈕
  (h32/fs12.5/w500/r8)。
- **全域**:字體 stack(app 樹內兩邊 computed 完全相同)、`-webkit-font-smoothing`、
  8px 自訂捲軸。

> **Workspace 外殼**(頂列 header／搜尋／EN／通知／頭像、左側 Home 與 App 分類 rail)
> 依 [ADR-0003](adr/0003-scope-limited-to-erd-cowork-app.md) 不在實作範圍,不列為差異。

---

## 以下為 2026-08-23 版紀錄,本次未重新驗證

⚠️ 這三節寫於 ticket 14–19 與 08-24/08-25 的 thread／streaming 批次**之前**。抽查時已發現
其中數項(例如版本選單的標題行、Artifact chip 的「shown right →」提示、「生成 Artifact」
兩段式流程)在那之後已經實作。要據此開票前,請先重新驗證。

## 功能(Function)

| 分類 | 項目                           | 設計稿                                                                                                                                                                                                                                                                                                            | 現有實作                                                                                                                            | 差異說明                                                                | 優先級                                            |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| 功能 | Schedule 頁面                  | 完整畫面:標題+「New schedule」鈕、說明文字、排程清單卡(icon 磚、標題、`cadence · last run`、Active/Paused 狀態 pill、暫停/恢復鈕),點列開啟該排程的 Artifact                                                                                                                                                       | `SchedulePage.tsx` 只有 `<h1>Schedule</h1>`                                                                                         | 整頁未實作(資料型別 `scheduleJob.ts` 已存在但無 UI)                     | 高                                                |
| 功能 | 「生成 Artifact」流程          | 工具列先顯示主色「生成 Artifact」鈕;點擊後 → 變「✓ 已生成」chip、Artifacts 計數 +1、左欄 Artifacts 列 coach 高亮 + toast(「前往 Artifacts」/「知道了」)、分享鈕解鎖                                                                                                                                               | 無「未生成」狀態:Artifact 一出現即顯示「已生成」,無生成動作、無 toast/coach                                                         | 「預覽 → 存成 Artifact」的兩段式流程整段缺失(`ArtifactPanel.tsx:92-97`) | 高                                                |
| 功能 | 對話內澄清表單                 | SPC/Inline 有「分析條件」表單(Part ID 多選、Time range chips+自訂、Data type 依已連線 Connector、送出鈕含 disabled 提示);DC item 選擇卡(搜尋、自訂新增、建議 3–5 項提示、「先產生這 N 項」、事後「補齊全部 N 項/先維持 N 項」);CP Test 有角色/Flow/Loop/時間區間/「只看我送測的」表單,送出後收合成「已設定…」摘要 | 送出訊息直接跑 steps 產出 Artifact,無任何表單(`dcItem.ts` 只有型別,全專案無使用處)                                                  | 多輪澄清互動整段缺失                                                    | 高(待確認:可能屬未實作的後續 ticket)              |
| 功能 | 全頁 Artifact 檢視工具列       | Back 鈕依來源顯示 Back/Home 並返回原畫面;中間為版本切換 pill 或「Shared to me」標題列(usergroup icon + 名稱 + 徽章);右側分享(主色)/重新整理/在新分頁開啟                                                                                                                                                          | 只有 Back(固定回 `/cowork/artifacts`)+ 靜態標題「Artifact」+ ThemeToggle;無版本切換、無分享/重新整理/開新頁鈕、無 Shared to me 變體 | `ArtifactFullPageView.tsx` 功能面大幅縮水                               | 高                                                |
| 功能 | 分享鈕 gating                  | 未生成前:灰底、`cursor:not-allowed`、tooltip「請先生成 Artifact」;生成後才變主色可點                                                                                                                                                                                                                              | 永遠主色可點;另加了設計稿沒有的綠勾 sharedIndicator 角標                                                                            | 與「生成」流程連動的狀態缺失                                            | 中                                                |
| 功能 | Steps 執行紀錄                 | 完成後保留「Worked through N steps」摺疊卡(可展開;每步有 title+description);執行中 label 為「eRD AI is working…」,steps 在帶框圓角卡內                                                                                                                                                                            | 完成後 steps 整個消失;執行中 label 只有「eRD AI」、只顯示 step title(description 有資料但不渲染)、無外框卡                          | `MessageList.tsx`:摺疊面板與 description 未實作                         | 中                                                |
| 功能 | Thread header 資料來源 chip    | 右側有「Inline DB · N5 line」chip(database icon,fs11.5、border-secondary、br7、pad 3 8)                                                                                                                                                                                                                           | 無此 chip;該位置放了 ThemeToggle                                                                                                    | 目前資料來源資訊在 Studio 無處顯示                                      | 中(ThemeToggle 位置屬 scope 調整,chip 缺失待確認) |
| 功能 | Schedule 的計數 badge          | 左欄 Schedule 列顯示排程數 badge(3)                                                                                                                                                                                                                                                                               | Schedule 列無 badge(`SessionList.tsx:213-221` 只有 Artifacts 有)                                                                    | 缺 badge                                                                | 中                                                |
| 功能 | 版本選單                       | 自訂選單(寬 340):標題行「版本 · 共 N 個,可切換後再生成」、目前版本 primary-bg 高亮 + vN 主色 + fw600、每列時間、published 綠勾                                                                                                                                                                                    | antd Dropdown:無標題行、無目前版本高亮、無 published 勾;`published` 是 per-version(設計稿),實作為 per-artifact `shared`             | 版本層級的生成/發佈狀態模型不同                                         | 中                                                |
| 功能 | 附件副檔名驗證                 | 只收 `.csv/.xlsx/.xls`(input `accept` + 錯誤「僅支援 .csv / .xlsx」)                                                                                                                                                                                                                                              | `useFileAttachments.ts` 無副檔名檢查、input 無 `accept`,任何檔案皆可附                                                              | 驗證缺失;錯誤文案也是英文                                               | 中                                                |
| 功能 | 附件 Modal「示範資料集」       | 有整段示範檔案清單(可點「加入/已加入」)                                                                                                                                                                                                                                                                           | 無此區塊                                                                                                                            | 缺失                                                                    | 中(待確認:或屬 demo 專用)                         |
| 功能 | Thread 自動捲動                | 新訊息後 `scrollTop = scrollHeight`(40ms 後)                                                                                                                                                                                                                                                                      | 無自動捲到底                                                                                                                        | 長對話時新回覆在畫面外                                                  | 中                                                |
| 功能 | Session rail 清單捲動          | New chat + Schedule/Artifacts 固定,session 清單 `flex:1; overflow-y:auto`                                                                                                                                                                                                                                         | rail `overflow:hidden`、`SessionList` 無內部捲動                                                                                    | session 多於一屏時後面項目無法捲到                                      | 中                                                |
| 功能 | Recents 空狀態                 | 永遠顯示 Recents 標頭 + 「No recent chats.」                                                                                                                                                                                                                                                                      | 空時整個 section 不渲染(`SessionList.tsx:144-146`)                                                                                  | 空狀態缺失                                                              | 低                                                |
| 功能 | Artifact 卡片選單「釘到 Home」 | 有「釘到 Home(每日指標)/從 Home 移除」項                                                                                                                                                                                                                                                                          | 無                                                                                                                                  | Home 已依 ADR-0003 排除,但此項目與 Cowork 卡片選單綁在一起              | 低(待確認)                                        |
| 功能 | 分享 Dialog 流程               | 「分享連結」列與「已加入左側 Artifacts 清單」banner 開啟即顯示;footer 左側有狀態文字(「分享給 N 個對象/請選擇…」);送出鈕為「Submit」+勾號 icon                                                                                                                                                                    | 連結與 banner 要按「分享」成功後才出現;無 footer 狀態文字;按鈕為「取消/分享/完成」                                                  | 流程時序與文案不同                                                      | 低(待確認:實作流程可能較合理)                     |
| 功能 | Gallery「Shared to me」去重    | 依名稱去重                                                                                                                                                                                                                                                                                                        | 不去重                                                                                                                              | 同名被分享 artifact 會重複顯示                                          | 低(待確認)                                        |
| 功能 | Copy Link 內容                 | 複製 `https://erd.cowork.app/a/...`(artifact 短網址)                                                                                                                                                                                                                                                              | 複製 app route(`window.location.origin/cowork/artifact/:id`)                                                                        | 連結格式不同                                                            | 低(待確認)                                        |
| 功能 | 「+」選單彈出方向              | 固定向上(`bottom:40px`)                                                                                                                                                                                                                                                                                           | antd 預設 placement(自動翻轉)                                                                                                       | 多數情況仍會向上,行為近似                                               | 低                                                |

## 排版(Layout)

| 分類 | 項目                      | 設計稿                                                       | 現有實作                              | 差異說明                | 優先級     |
| ---- | ------------------------- | ------------------------------------------------------------ | ------------------------------------- | ----------------------- | ---------- |
| 排版 | 三欄預設寬度              | session rail 270、thread 430(拖曳範圍同為 200–460 / 320–720) | 280、480                              | min/max 一致,預設值不同 | 低(待確認) |
| 排版 | 排序選單選中態            | 選中列 primary-bg 高亮 + icon 轉 primary + 勾號              | antd 選單,僅勾號                      | 高亮缺失                | 低         |
| 排版 | 收合 rail flyout 群組標頭 | 純標籤(不可收合)                                             | 沿用可收合的 SessionGroup(帶 chevron) | 實作多了收合能力        | 低         |

## 文案 / 語言(歸入功能待確認)

| 分類 | 項目               | 設計稿                                                                                                                                                                                | 現有實作                                              | 差異說明                 | 優先級               |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------ | -------------------- |
| 功能 | 介面語言           | 中英混用:排序「排序: 釘選優先/最近建立/名稱 A→Z」、gallery 空狀態中文、附件 modal 中文(「點擊選擇 或把檔案拖拉到這裡」「最多 5 個檔案 · 總計上限 5 GB」)、錯誤「僅支援 .csv / .xlsx」 | 上述全部英文(分享 dialog 除外,其為中文且與設計稿一致) | 中文文案系統性被改為英文 | 中(待確認:i18n 決策) |
| 功能 | Artifact chip 文案 | 「{名稱}」+ 灰色「shown right →」提示                                                                                                                                                 | 「Artifact: {名稱}」,無提示                           | 文案不同                 | 低                   |
| 功能 | 開新頁 tooltip     | 「在新分頁開啟預覽」                                                                                                                                                                  | 「在新分頁開啟」                                      | 一字之差                 | 低                   |

## 已確認為「刻意調整」、不列為差異的項目

- **Workspace 外殼**(頂部 header、搜尋、EN/主題切換/通知/頭像、左側 Home/My Favorites/App Categories):ADR-0003 明訂範圍僅 eRD Cowork,故不比對。ThemeToggle 移到 thread header 是此裁切的必然結果(但 header 右側原本的資料來源 chip 因此消失,已列於上表)。
- **「在新分頁開啟」機制**:設計稿是 clone DOM + ECharts 轉圖片的靜態預覽;實作走 `/cowork/artifact/:id` route(ADR-0002 route 化的刻意決定)。
- **開場未選 session**(「Select or start a session」狀態):設計稿 demo 固定預選;實作由 URL 驅動,屬合理增補狀態。
- **Artifact 內容本身**(控制圖、pareto、分佈圖等圖表):實作 fixture 刻意不含真圖表(僅 stat 磚),為既定的 mock 範圍,不列入。
