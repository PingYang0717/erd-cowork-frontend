> **狀態註記(2026-08-27)**:sandbox 之上後來加了第二層——`utils/artifactCsp.ts` 在
> srcdoc 呈現前注入 `<meta http-equiv="Content-Security-Policy">`(`default-src 'none';
connect-src 'none'`,host 來源用父頁 origin 明寫)。sandbox 擋同源存取,CSP 擋
> Artifact HTML 對外發網路請求;兩層互補,本文的 iframe 決策不變。
>
> **狀態註記(2026-08-28)**:Artifact HTML 的 theme 變體決議不做。下文「Dark mode
> 需求下…依主題回傳對應配色的 HTML」一段作廢:`?theme=` query 與 iframe 內
> `postMessage` 換色通道皆已移除,Artifact 文件只有單一配色;App 本身的深色模式
> (antd algorithm)不受影響。重掛表格中「切換主題」一列隨之失效,`useArtifactContent`
> 的 query key 只剩 `artifactId` 與 `reloadNonce`,Reload 並以 `?r={nonce}` 作
> cache-buster。iframe 渲染與重掛決策本身不變。

# Artifact 內容以 sandboxed iframe 渲染

Artifact（Scenario 執行後的分析成果）以完整 HTML 字串的形式由 API 回傳，而非結構化圖表資料。我們選擇用 `<iframe sandbox srcDoc={html}>` 掛載這段 HTML，而不是用 React 元件重繪圖表、也不是用 `dangerouslySetInnerHTML` 直接注入主 DOM。原因是生成的 HTML 內可能自帶 `<script>`（例如載入 ECharts 畫圖），iframe 是唯一能讓這些 script 正常執行、同時完全隔離主 app 樣式與 JS 執行環境（避免 XSS 外洩與 CSS 互相污染）的方式。

Dark mode 需求下，主 app 透過 `postMessage` 通知 iframe 目前主題，由產生 Artifact 的一方（mock 階段為前端自建、未來為後端）依主題回傳對應配色的 HTML。

## 重掛的觸發條件

iframe 的 `key` 是 `${artifactId}-${reloadNonce}`。這決定了三件事各自走哪條路:

| 動作                      | 走哪裡                                                  | iframe 是否重掛                     |
| ------------------------- | ------------------------------------------------------- | ----------------------------------- |
| **切換 Artifact 版本**    | `artifactId` 改變                                       | 是——那是另一份文件                  |
| **切換主題（Dark mode）** | query key 的 `theme` 改變,`keepPreviousData` 撐住舊文件 | **否**——srcDoc 在同一份文件底下換掉 |
| **重新整理（Reload）**    | `reloadNonce` +1                                        | 是——這正是 Reload 的意思            |

theme 與 nonce 的意圖恰好相反(前者要「換內容不重掛」,後者要「強制重掛」),所以兩者同時
出現在 `useArtifactContent` 的 query key,但只有 nonce 進 iframe 的 `key`。

`reloadNonce` 放在 `useActiveRunStore`,因為它有兩個互相看不到的呼叫端:Artifact 面板自己的
Reload 按鈕,以及在對話串那側完成的**修復（Repair）**。修復成功時只 invalidate 是不夠的——
那個卡住的文件還掛在畫面上,連同讓它出錯的狀態一起。
