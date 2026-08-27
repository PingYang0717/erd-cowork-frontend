# 0009. 執行時不再有 mock 後端,未實作的端點回 stub、操作停用

日期:2026-08-27

## 狀態

Accepted。取代 [ADR-0005](0005-sse-streaming-replaces-batch-reply.md) 中「傳輸由
build-time flag 決定」的部分,並終結 [ADR-0007](0007-verbatim-backend-wire-contract.md)
第 4 點的 hybrid 傳輸。

## 背景

後端已進入開發。在此之前,整個 app 由 MSW 服務:`VITE_AGENT_TRANSPORT` 決定哪些請求穿透
到真後端,其餘由 `handlers.ts`(831 行)以 localStorage 為後盾應答。

這在「還沒有後端」時是對的,現在開始說謊。畫面上按得動的東西有兩種來源——後端真的有的,
以及 mock 編出來的——而使用者、甚至開發者,都分不出是哪一種。Session 改名、Artifact 生成
與分享、Connector 連線,全部屬於後者:它們在 dev 環境運作良好、跨重整仍在,而真後端一條
都沒有。

## 決策

1. **runtime 不啟動 MSW**。`main.tsx` 直接 render;`config/transport.ts`、
   `mocks/browser.ts`、`LIVE_BACKED` 過濾一併刪除。只有一種模式:打真後端。
2. **後端未實作的讀取,在 api 模組回 stub**——就寫在它假裝的那個函式旁邊,不抽成
   `stubs/` 目錄,這樣呼叫端一眼看得出哪條是假的。目前三條:`GET /artifacts`、
   `GET /connectors`、`GET /directory`。（`GET /artifacts` 一度也在此列,後端上線後已移除。）
3. **後端未實作的寫入,在 UI 停用**,標示「後端尚未支援」。按鈕用既有的延遲 Tooltip;
   選單項目不行(停用的項目吞掉 pointer event),所以理由直接寫在畫面上
   (`UnsupportedLabel`)。
4. **停用的粒度是入口**。分享鈕本身 disabled,而不是讓對話框開得起來、填完才發現送不出。
5. **api 的寫入函式保留但沒有呼叫端**,標註原因。它們是 `docs/api/interface.md` 的可執行
   版本,後端補上那天,UI 只要拿掉一個 `disabled`。
6. **連不上後端就顯示連不上**,不 fallback 到 stub。
7. **測試繼續跑 MSW**。`mocks/` 降級為 test-only,只服務後端真的有的九條加上 SSE 劇本。

## 後果

**得到**:畫面上看到的就是後端真的有的。「這條還沒接」變成 UI 上看得見的事實,而不是
埋在 `LIVE_BACKED` 清單裡的知識。

**失去**:離線把整個產品跑一遍的能力。dev 環境需要後端在跑;`generate-coach` 引導、分享
對話框、Gallery 的釘選篩選,在對應端點補上前只剩靜態外觀。

**測試**:228 → 218。驅動那些流程的測試,能改成「驗證控制項確實停用」的就改
(它守住的是「沒有人不小心把 disabled 拿掉」),行為整個消失的就刪。

### 後端 ready 時要復活的測試

刪掉的測試原本驗了什麼,記在這裡,免得復活時只剩檔名:

| 檔案                                           | 原本驗證的行為                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `StudioPage.test.tsx`                          | pin 後移入 Pinned、unpin 後移回 Recent、Enter 改名、Escape 取消改名、選單刪除、重整後分組不變 |
| `ArtifactsGalleryPage.test.tsx`                | pin 後跨重整仍在、delete 後跨重整不再出現、從卡片選單開啟分享對話框                           |
| `StudioPage.artifact-share.test.tsx`(整檔刪除) | 分享對話框的 Artifact 資訊卡、搜尋收件人 → 分享 → 顯示連結                                    |
| `StudioPage.artifact-generate.test.tsx`        | 生成後翻成「已生成」chip、Share 以已生成為前提解鎖                                            |
| `StudioPage.artifact-toolbar.test.tsx`         | Share 開啟對話框、已分享後工具列維持原樣                                                      |
| `StudioPage.connectors.test.tsx`               | 連線後跨重整仍是 connected、斷線                                                              |
| `StudioPage.generate-coach.test.tsx`           | 生成後 badge +1、nav 高亮、toast 兩個動作、知道了/前往 Artifacts                              |

被停用但**保留在程式碼裡**、因此不需要重寫的:Session 行內改名的 `<Input>`、
`ShareArtifactDialog` 與 `useDirectory`、以及所有 api 寫入函式。
