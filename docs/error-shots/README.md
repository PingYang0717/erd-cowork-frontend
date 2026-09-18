# Chat 與 Artifact 面板的錯誤畫面（2026-09-18，臨時 branch）

每一張都是用假 API 製造出來的狀態，對應 feat/iframe-postmessage 最新 commit。底部與圓窗的中秋裝飾是因為今天已在中秋前 14 天的區間內，實機也會這樣。

## 對話欄整塊載入失敗

| 情境 | 畫面 |
|---|---|
| `GET /sessions/:id` 回 502 | ![](01-chat-thread-load-failed.png) |
| `GET /sessions/:id` 回 404（對話在別處被刪） | ![](02-chat-session-not-found.png) |
| 後端連不上（連線被拒） | ![](03-chat-backend-offline.png) |
| 只有 composer 的周邊讀取失敗（`/connectors` 500），對話仍可讀 | ![](04-chat-composer-load-failed.png) |

## 執行中或執行後的錯誤

| 情境 | 畫面 |
|---|---|
| 串流送出 `ERROR` 事件，歷史沒有記到任何回覆：泡泡留著，紅字是後端的 message | ![](05-chat-run-error-bubble.png) |
| 串流失敗，但後端有把 agent 自己的說法存進歷史：泡泡交棒，只剩歷史那列與步驟摘要的紅 ✗ | ![](06-chat-run-failed-recorded-by-history.png) |
| `POST /messages` 直接被拒（503，帶 code 與 message） | ![](07-chat-send-refused.png) |
| 串流中途斷線 | ![](08-chat-network-dropped.png) |
| 後端記下的「回應已中斷」紀錄，旁邊有重新嘗試 | ![](09-chat-interrupted-record.png) |
| 檔案超過保留期：composer 上方提示、檔案標「已過期」、送出被擋 | ![](10-chat-files-expired.png) |

## Artifact 執行錯誤與修復

| 情境 | 畫面 |
|---|---|
| iframe 丟出 JS 錯誤 → 對話欄底部的修復提議 | ![](11-chat-repair-offer.png) |
| 按修復，後端回 `repaired: false` | ![](12-chat-repair-did-not-succeed.png) |
| 再試一次，後端回 409 `FILES_EXPIRED` | ![](13-chat-repair-files-expired.png) |
| Artifact 透過 MCP bridge 呼叫工具，後端回 400 `INVALID_CALL` → 同一種提議 | ![](14-chat-repair-offer-from-mcp-call.png) |

## Artifact 面板

| 情境 | 畫面 |
|---|---|
| `GET /artifacts/:id` 回 500：版本列與工具列都在，只有內容區說載入失敗 | ![](20-artifact-load-failed.png) |
| `GET /artifacts/:id` 回 404：說已不存在，請從版本選單挑別的 | ![](21-artifact-missing.png) |
| `GET /artifacts`（清單）回 500：側邊欄整塊倒下，兩個面板退回空狀態 | ![](22-artifact-list-failed.png) |

## 整個 app

| 情境 | 畫面 |
|---|---|
| `GET /sessions` 回 403 `ENTITLEMENT_DENIED`：整頁蓋住，顯示後端自己的說明 | ![](30-app-access-denied.png) |
| 某個操作失敗（釘選回 500）：右上角 toast | ![](31-toast-action-failed.png) |
