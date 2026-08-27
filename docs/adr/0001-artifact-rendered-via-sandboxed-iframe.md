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
