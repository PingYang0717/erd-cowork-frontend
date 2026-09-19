# 0017. Artifact 取 Connector 資料走 postMessage 代打,不放寬 CSP

日期:2026-09-16
狀態:已採納(修訂 [ADR-0001](0001-artifact-rendered-via-sandboxed-iframe.md) 的最後一條後果)

## 背景

Artifact 是 LLM 產出的完整 HTML,掛在 `sandbox="allow-scripts"` 的 iframe 裡,並由
`utils/artifactCsp.ts` 注入 `connect-src 'none'`(ADR-0001)。它畫得出東西,但畫的是
產出當下的資料。現在 dashboard 需要在畫面上**自己去查** Connector——換個時間區間、
展開某個 Lot——而它發不出任何網路請求。

ADR-0001 的後果段寫著:「若未來需要它取資料,得改的是 CSP。」這份 ADR 記的是
為什麼**不**那樣做。

## 決策

**iframe 不發請求。它把呼叫 postMessage 給 Cowork,Cowork 打後端,再把結果 postMessage
回去。** CSP 一字不改。

兩個訊息:

- iframe → Cowork:`{ type: 'erd-mcp-call', id, connector, tool, args }`
- Cowork → iframe:`{ type: 'erd-mcp-result', id, result }`,`result` 是 `{ data }` 或
  `{ error: { code, message } }` 擇一

Cowork 這側是 `hooks/useMcpCallBridge.ts`,掛在 `ArtifactFrame` 上;後端這側是
`POST /artifacts/{artifactId}/mcp-call`。完整協定在
[`docs/api/interface.md`](../api/interface.md) 的「MCP call」一節。

**Cowork 是信差,不是參與者。** 它不讀 `data`、不畫錯誤、不重試、不判斷授權。誰能
打哪個 Connector 由後端從 `artifactId` 反查 Session 與已選來源決定;失敗時要顯示什麼、
要不要再試,由 dashboard 自己決定——它才知道自己問了什麼、沒拿到要用什麼代替。

**唯一的例外:兩種失敗會進修復(Repair)流程。** `TOOL_ERROR`(Tool 有跑但失敗)與
`INVALID_CALL`(Tool 名稱或參數寫錯)說的是「這段 HTML 把呼叫寫錯了」,那是重產才修
得好的事,跟 JS 例外同一類。Cowork 把它們報進 repair store,走現有的對話串提議。其他
五個碼(`AUTH`、`RETRYABLE`、`CONNECTOR_UNREACHABLE`、`CONNECTOR_UNAVAILABLE`、
`CONNECTOR_NOT_ALLOWED`)不是 HTML 的錯,不報。

全頁檢視沒有對話串,提議在那裡沒地方畫,所以 `ArtifactFrame` 收一個
`offersMcpRepair`,全頁傳 `false`。JS 例外的既有行為不動——那個缺口早於這份 ADR。

## 為什麼不放寬 CSP

放寬 `connect-src` 讓 iframe 直接打 `/api`,要解決三件事,每一件都比 bridge 貴:

1. **身分**。sandboxed iframe 的 origin 是 opaque,不帶 cookie,也拿不到
   `X-User-Id` 或 internal 環境的 SSO header(ADR-0007 的 `setAuthHeaderProvider`)。
   要嘛把憑證注入 HTML(LLM 產的 HTML 拿到憑證),要嘛開 `allow-same-origin`
   (等於拆掉 sandbox)。bridge 讓請求從 Cowork 的 window 發出,現有的 interceptor
   自然生效,iframe 從頭到尾看不到任何憑證。
2. **範圍**。CSP 只能開一個 host,開了 `/api` 就是整個 API。bridge 只有一條路,
   路徑寫死在 Cowork 這側,iframe 選不了要打哪裡。
3. **403 的處理**。存取遭拒是帳號層級的事實,要蓋住整個 app(ADR-0016)。請求從
   Cowork 發出,`noteIfAccessDenied` 照常攔到;從 iframe 發出的話,那個 403 死在
   iframe 裡,Cowork 不知道。

代價是多一層協定要跟後端對,以及 iframe 內要有一段 runtime 負責 postMessage 與
Promise 配對。那段 runtime 由後端在組裝 HTML 時注入,跟現在的錯誤收集器同一個位置——
LLM 看到的 prompt 和 runtime 的 API 由同一方維護,才不會脫節。

## 後果

- `connect-src 'none'` 維持。ADR-0001 的前提沒有變,只是「取資料」有了不動 CSP 的路。
- 每個 iframe 同時最多 8 個呼叫在飛,超過的排隊;單一呼叫 30 秒沒回就以 `RETRYABLE`
  回覆。數字在 `useMcpCallBridge.ts` 的常數,可調。
- iframe 重掛(Reload、切版本)時,在飛的請求取消、排隊的清空,不回覆——舊 window 已經
  不在了。
- 這個 repo 只能用假的 iframe 內容測 Cowork 這側。協定的另一半在後端,
  `interface.md` 那一節是兩邊唯一的共同依據。
- `types/api/mcpCall.ts` 的 `McpErrorCode` 是開放聯集:Cowork 只轉交,後端加碼不需要
  前端跟著改;只有 `TOOL_ERROR` 與 `INVALID_CALL` 被指名讀取。整張清單只在一處被讀——
  非 200 的回應帶著已知 code 時,信 code 不信狀態碼。
