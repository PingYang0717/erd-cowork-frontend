# `chore/remove-mock-layer` — 拔掉 runtime mock,把 code 準備好接真後端

分支基準:`master@26c36ae`　·　狀態:**已完成**,6 顆 commit
測試 228 → 218(42 檔),`tsc -b`、`npm run lint` 乾淨。

後端正在開發中。這一輪不等它,先把前端調整成「畫面上看到的就是後端真的有的」——
runtime 不再有任何假裝成後端的東西,後端還沒做的功能在 UI 上明確停用。

`feat/artifact-interface` 留給 artifact 介面對齊那件事,不混在這裡:這支會刪掉上千行、
改掉一批測試,跟型別對齊各自 review、各自 revert 才乾淨。

---

## 目標

1. **runtime 沒有 MSW**。`npm run dev` 打的是真後端,連不上就顯示連不上。
2. **後端還沒有的讀取端點回 stub**,寫在 api 模組裡,一眼看得出哪條是假的。
3. **後端還沒有的寫入操作在 UI 停用**,disabled + tooltip「後端尚未支援」。
4. **測試繼續跑 MSW**。`mocks/` 不消失,降級成 test-only fixtures。

## 非目標

- 不動 `vite.config.ts` 的 proxy 與 `.env` 的後端位址(使用者自理)。
- 不對齊 artifact 介面(那是 `feat/artifact-interface`)。
- 不做各 pane 獨立的錯誤邊界(之後的事)。

---

## 決策紀錄

以下每一條都是 grill 出來的,列在這裡是為了讓 review 的人知道**替代方案被考慮過**。

| #   | 決策                                                      | 捨棄的選項與理由                                                  |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | 測試保留 MSW,`mocks/` 變 test-only                        | 改用 `vi.mock` 會把「驗到 HTTP body」降級成「驗有呼叫函式」       |
| 2   | stub 直接寫在 api 模組內,不抽 `stubs/` 目錄               | 抽出去會讓呼叫端看不出真假                                        |
| 3   | 未支援的操作 disabled + tooltip                           | 移除 = 之後忘記補;可點但沒反應 = 使用者以為壞了                   |
| 4   | Scenario/question/artifact fixtures 搬進 test-only        | 保留 demo 模式 = 留一個沒人走的分支                               |
| 5   | 刪除 `VITE_AGENT_TRANSPORT` / `isLive` / `LIVE_BACKED`    | 同上                                                              |
| 6   | 後端連不上就顯示連不上,**不** fallback 到 stub            | fallback 會讓「後端壞了」偽裝成「後端好了」                       |
| 7   | 單獨開 `chore/remove-mock-layer`                          | 混進 feature 分支會讓 diff 被幾百行刪除淹沒                       |
| 8   | 寫入類 api 函式**留著並標註**,不刪                        | 它們是契約的可執行形狀,後端 ready 那天的接點                      |
| 9   | stub 沿用現有 fixtures 內容,不精簡                        | Gallery 篩選/排序、connector 四種狀態需要資料多樣性才測得出來     |
| 10  | tooltip 文案「後端尚未支援」(中文)                        | 「後端尚未實作」把內部分工洩漏給使用者                            |
| 11  | 寫 ADR-0009                                               | 三條件皆成立:難逆轉、沒脈絡會覺得奇怪、有真取捨                   |
| 12  | 前端-only 概念(`generated`/`pinned`/`shared`)**一併停用** | 保留本地狀態會製造新的假象:按了有反應但沒有後端根據               |
| 13  | (跳過,proxy 由使用者自理)                                 | —                                                                 |
| 14  | README / `architecture.md` / `AGENTS.md` 一起改           | 開頭那句「純前端 + mock 後端」是新人的第一印象,留著錯的比沒有更糟 |
| 15  | `ErrorBoundary` 針對網路錯誤給明確訊息 + 重試             | 這是拔掉 mock 後最常見的失敗情境                                  |
| 16  | 刪掉 15 條沒有呼叫端的 handler                            | 存成 `handlers.future.ts` = 契約有三份,會各自漂移                 |
| 17  | 停用的粒度是**入口** disabled                             | 進得去但送不出 = 一路填完才發現送不出                             |
| 18  | 測試改寫成「驗 disabled」,不 `it.skip`                    | skip 的測試依賴的 handler 已刪,打開也跑不起來                     |
| 19  | `interface.md` 每張表加「後端狀態」欄                     | 拆兩份文件 = 找一條端點要翻兩次                                   |

**`CONTEXT.md` 不動。** 它是領域語言,不是實作現況——Session「可命名、釘選」、Artifact
「可分享、切版本」描述的是這個產品是什麼,暫時停用不改變這件事。

---

## 停用清單

| 功能                          | 端點                            | UI 位置                                   |
| ----------------------------- | ------------------------------- | ----------------------------------------- |
| Session pin / rename / delete | `PATCH`,`DELETE /sessions/:id`  | `SessionList` 的 `...` 選單               |
| Artifact 生成                 | `POST /artifacts/:id/generate`  | Studio 右欄工具列 + `generate-coach` 引導 |
| Artifact 分享                 | `POST /artifacts/:id/share`     | 右欄 Share 鈕、Gallery 卡片選單           |
| Artifact pin / delete         | `PATCH`,`DELETE /artifacts/:id` | Gallery 卡片選單與 pin 鈕                 |
| Connector 連線 / 斷線 / 新增  | `PATCH`,`POST /connectors`      | `ConnectorsPanel`                         |

Gallery 卡片選單停用後只剩 **Copy Link** 可用(純前端 clipboard,不打 API)。
`ShareArtifactDialog` 與 `useDirectory` 因此失去呼叫端,依決策 8 留著並標註。

## Stub 清單(讀取類)

| 端點              | 資料來源                                          |
| ----------------- | ------------------------------------------------- |
| `GET /artifacts`  | 現有的 3 筆 fixtures(含一筆 pinned、一筆他人分享) |
| `GET /connectors` | 現有的 10 筆(涵蓋四種狀態)                        |
| `GET /directory`  | 現有 fixtures                                     |

## 保留在 `handlers.ts` 的(測試用)

`GET /config`、`GET /sessions`、`GET /sessions/:id`、`POST /sessions/:id/messages`(SSE
劇本)、`POST`/`DELETE` session files、`GET /artifacts/:id`、`/raw`、`POST /repair`,
外加 test-only 的 `example-widgets`。約 831 → 400 行。

**刪除的 15 條**:session 寫入三條、artifacts 清單/pin/delete/share/generate 五條、
connectors 三條、`/directory`、`/dc-items` 兩條(前端從來沒打過,只有型別匯出)。

---

## 執行順序

| #   | Commit                      | 內容                                                                                                            |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | [`eb61c32`] `chore(config)` | 刪 `transport.ts`、`isLive`、`main.tsx` 的 `enableMocking()`、`mocks/browser.ts`、`LIVE_BACKED`、`.env` 的 flag |
| 2   | [`38b75fc`] `feat(ui)`      | 停用清單上的入口全部 disabled + 說明,並改寫受影響的測試                                                         |
| 3   | [`6e10cd5`] `feat(api)`     | 讀取類三條改回 stub                                                                                             |
| 4   | [`b6a3bfe`] `feat(error)`   | `describeLoadError` + ErrorBoundary 認得「連不上後端」                                                          |
| 5   | [`8ef9380`] `chore(mocks)`  | 刪掉 14 條死 handler(831 → 648 行)                                                                              |
| 6   | `docs`                      | ADR-0009、`interface.md` 後端狀態欄、README/architecture/AGENTS、`backend-integration.md`                       |

**與計畫的兩處出入**,都是為了讓每顆 commit 保持綠燈:

1. **停用 UI 與測試改寫合併成一顆**(原計畫 3 與 5)。分開會有一顆 commit 是紅的:控制項
   一旦 disabled,那些點擊它的測試當場就失敗。
2. **停用 UI 排在 stub 之前**(原計畫 2 與 3 對調)。反過來的話,mutation 會寫進 MSW 而
   refetch 讀到固定 stub,Gallery 的 pin/delete/share 測試會在切 stub 那一顆就變紅。

**受影響的測試比估計多**:估 13 個,實際 24 個。多出來的是 `generate-coach`(整套引導由
生成觸發)、`ArtifactPage` 工具列、以及 Gallery 幾個斷言選單項目名稱的測試——停用說明寫進
了 label,可及名稱因此改變。

## 後端 ready 時要復活的測試

ADR-0009 會附同一份清單。這裡先記原本測到什麼,免得復活時只剩檔名:

| 檔案                                    | 原本驗證的行為                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `StudioPage.test.tsx`                   | pin 後移入 Pinned、unpin 後移回 Recent、Enter 改名、選單刪除、重整後分組不變 |
| `ArtifactsGalleryPage.test.tsx`         | pin 後跨重整仍在、delete 後跨重整不再出現、篩選不受 pin 影響                 |
| `StudioPage.artifact-generate.test.tsx` | 生成後翻成「已生成」chip、Share 以已生成為前提、版本間 generated 各自獨立    |
| `StudioPage.connectors.test.tsx`        | 連線後跨重整仍是 connected、斷線                                             |
| `StudioPage.artifact-share.test.tsx`    | 搜尋收件人 → 分享 → 顯示連結                                                 |
| `StudioPage.artifact-toolbar.test.tsx`  | 已分享後工具列的徽章與 Share 呈現                                            |
