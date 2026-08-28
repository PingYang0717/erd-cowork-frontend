# 0001. Artifact 以 sandboxed iframe 渲染,且只有單一配色

日期:2026-08-28

## 背景

Artifact(Scenario 執行後的分析成果)由 API 以**完整 HTML 字串**回傳,不是結構化圖表
資料。那段 HTML 可能自帶 `<script>`——後端組裝時會注入 ECharts 主題與錯誤收集器,
模型產出的內容也常自己畫圖。要把它放上畫面,有三條路:用 React 元件依資料重繪、用
`dangerouslySetInnerHTML` 注入主 DOM、或放進 iframe。

## 決策

**用 `<iframe sandbox="allow-scripts" srcDoc={html}>` 掛載。** 它是唯一能讓那些
script 正常執行,又完全隔離主 app 的 CSS 與 JS 執行環境的方式;重繪路線做不到(HTML
不是資料),`dangerouslySetInnerHTML` 則等於把未知的 script 請進自己的 DOM。

**sandbox 之上再加一層 CSP。** `utils/artifactCsp.ts` 在 srcdoc 呈現前注入
`<meta http-equiv="Content-Security-Policy">`(`default-src 'none'; connect-src 'none'`,
host 來源用父頁 origin 明寫)。sandbox 擋的是同源存取,CSP 擋的是 Artifact HTML 對外
發網路請求——兩層互補,少任何一層都有缺口。srcdoc 看不到 HTTP header,所以只能用
`<meta>` 注入。

**Artifact HTML 沒有 theme 變體。** 深色模式只作用在 app 本身(antd algorithm),
iframe 內的文件永遠是單一配色。曾經存在的 `?theme=` query 與往 iframe 內送
`{ type: 'theme' }` 的 postMessage 都已移除:真後端從不讀那個參數,產生 Artifact 的
agent 也從不知道 theme 存在,兩條通道都是空的。

## 重掛的觸發條件

iframe 的 `key` 是 `${artifactId}-${reloadNonce}`,這決定了兩件事各自走哪條路:

| 動作                   | 走哪裡            | iframe 是否重掛          |
| ---------------------- | ----------------- | ------------------------ |
| **切換 Artifact 版本** | `artifactId` 改變 | 是——那是另一份文件       |
| **重新整理(Reload)**   | `reloadNonce` +1  | 是——這正是 Reload 的意思 |

`useArtifactContent` 的 query key 是 `['artifacts', artifactId, reloadNonce]`,並刻意
留在 `useQuery` + `keepPreviousData` 而非 suspense query:兩個 key 成員都在文件已經
上畫面時變動,suspend 會把面板閃成 fallback。`getContent` 在 nonce > 0 時附
`?r={nonce}` 當 cache-buster。

`reloadNonce` 放在 `useActiveRunStore`,因為它有兩個互相看不到的呼叫端:Artifact
面板自己的 Reload 按鈕,以及在對話串那側完成的**修復(Repair)**。修復成功時只
invalidate 是不夠的——那個卡住的文件還掛在畫面上,連同讓它出錯的狀態一起。

## 後果

- Artifact 讀不到外層的 CSS 變數,所以 `src/mocks/artifactFixtures.ts` 自帶一份同值的
  亮色色票;改色時兩邊要一起改。
- 深色模式下,右側面板是亮的。這是已知且接受的:要讓它變深色,得由產生 HTML 的一方
  出深色版本,那是 agent 端的工作,不是前端能後製的。
- Artifact 內的 script 無法發出任何網路請求。若未來需要它取資料,得改的是 CSP,而且
  要重新評估這個決策的前提。
