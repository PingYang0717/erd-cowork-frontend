# Artifact 內容以 sandboxed iframe 渲染

Artifact（Scenario 執行後的分析成果）以完整 HTML 字串的形式由 API 回傳，而非結構化圖表資料。我們選擇用 `<iframe sandbox srcDoc={html}>` 掛載這段 HTML，而不是用 React 元件重繪圖表、也不是用 `dangerouslySetInnerHTML` 直接注入主 DOM。原因是生成的 HTML 內可能自帶 `<script>`（例如載入 ECharts 畫圖），iframe 是唯一能讓這些 script 正常執行、同時完全隔離主 app 樣式與 JS 執行環境（避免 XSS 外洩與 CSS 互相污染）的方式。

Dark mode 需求下，主 app 透過 `postMessage` 通知 iframe 目前主題，由產生 Artifact 的一方（mock 階段為前端自建、未來為後端）依主題回傳對應配色的 HTML。
