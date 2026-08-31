# 0007. apiClient / fileApi / bootstrap 與 cowork 上游檔案級對齊

日期:2026-08-28

## 背景

兩份前端接同一個後端,cowork 上游(`https://github.com/Michelle12369/cowork.git` 的
`frontend/`)是 internal 部署實際走的那份。本專案的網路層曾與它逐步分歧:獨立的
`identity.ts` 模組、response interceptor 統一拆 `data` 的 typed wrapper、
`VITE_API_BASE_URL` 環境變數、手組 multipart + XHR 的上傳,以及**完全沒有** internal
啟動接縫(SSO 在 mount 前決定身分的那道門)。

每一項單看都有理由,合起來的代價是:任何要在兩份前端之間搬動的 internal 接入
(`internal.impl.ts`、gateway header、Keycloak)都得寫兩種版本。

## 決策

`src/api/apiClient.ts`、`src/api/fileApi.ts`、`src/bootstrap/internal.ts` 三支檔案與
cowork 上游**檔案級同形**(不只是行為等價),連帶採納其契約。**不要為本專案的便利
改這三支**——改了就失去 diff-zero 的對齊價值。

1. **身分併入 `apiClient.ts`**:`getUserId` / `getAuthHeaders` /
   `setAuthHeaderProvider`,匿名 id 的 localStorage key 是 `erd_user_id`,
   `getUserId` 每次直讀、不快取。provider 的回傳值語意是**完全取代**——回傳什麼就
   送什麼,「回傳 `{}` 讓 gateway 蓋 header」是其合法特例。**provider 每次請求都被
   呼叫,NEVER 快取回傳值**:internal 的 token 會背景刷新,快取住會在過期後開始 401,
   而且只在 internal 環境發生,本機測不出來。
2. **~~沒有 response unwrap interceptor~~**(2026-08-28 修訂,見下方「同形的範圍」):
   response interceptor 拆掉 `res.data`,`apiClient` 是一層有型別的包裝,呼叫端直接
   拿到資料本身。原始的 axios instance 以 `httpClient` 匯出,只給操作 axios 本身的
   接線用(註冊 interceptor、測試換 adapter)。
3. **base URL 寫死 `/api`**,沒有環境變數,也沒有 timeout(上傳走 axios 後,固定
   timeout 會誤殺大檔)。dev/preview 由 `vite.config.ts` proxy 到 `localhost:8080`。
4. **上傳走 axios + `FormData` + `onUploadProgress`**,具名匯出。瀏覽器自行從磁碟
   串流 FormData,不需要把整份檔案讀進記憶體。
5. **internal 啟動接縫**:`src/bootstrap/internal.ts` 以 `import.meta.glob` 偵測
   `internal.impl.ts`(只存在於 internal 環境,glob 對不存在的檔案回傳空物件而非
   build error,這是接縫在預設環境能成立的原因);`main.tsx` 在 mount 前
   `await initInternalRuntime()`,**刻意不 catch**——初始化失敗就不 mount,NEVER 以
   匿名身分繼續。檔名與 `initialize` 這個 export 名稱都是固定的,改了 glob 偵測不到
   而且不會報錯,只會安靜地什麼都不做。

不走 axios 的路(`agentApi` 的 raw fetch)MUST 自行帶 `...getAuthHeaders()`。

## 同形的範圍(2026-08-28 修訂)

原本的決策是三支檔案**逐行**與 cowork 相同。實作後回頭看,那個範圍畫得太寬:這份
ADR 要保護的是 **internal 部署能不能只寫一份 `internal.impl.ts`**,而那件事完全落在
**request 端**——身分、auth header provider、base URL、bootstrap 時序。response 怎麼
拆封跟 internal 接入沒有任何關係。

所以同形的範圍收窄為:**身分與 auth header provider(第 1 點)、base URL 與無 timeout
(第 3 點)、上傳的 FormData 路線(第 4 點)、bootstrap 接縫(第 5 點)**。這幾項
NEVER 為了本專案的便利更動。

response unwrap 不在範圍內。原本的寫法讓 16 個呼叫點各自重複
`.then((res) => res.data)`,換到的只是 `apiClient.ts` 這一支的 diff 數字好看;真正
要 diff 的東西(provider 語意、glob 接縫)並不因為多一個 response interceptor 而
變得難比對。

## 後果

- internal 接入只需寫一份 `internal.impl.ts`,兩份前端通用;上游演進時,比對的是上面
  列出的那幾項語意,而不是整支檔案的字面。
- ~~本專案其餘 api 模組維持物件風格(`artifactApi.getContent`),與 cowork 的具名函式
  風格並存。對齊範圍只含上列三支檔案,不擴。~~

  **2026-08-31 推翻。** 其餘模組也改成具名函式,`src/api/` 從此只有一種形式。這不是
  擴大對齊範圍,而是讓對齊**不再需要是例外**:三支檔案本來就是具名函式,當全部都是
  具名函式時,cowork 那一側的形式自動成立,不必再寫一條規則說明它們為何不同。

  改用具名函式的判斷依據是實測而非偏好:
  - 物件風格常見的理由是測試可以 `vi.spyOn(artifactApi, 'publish')`——本專案**一次都
    沒這樣做**,測試一律走 MSW 在網路層攔截(ADR-0006),所以物件沒帶來測試上的便利。
  - tree-shaking 也不成立:八個方法用到八個,沒有東西可以搖掉。
  - 反而 `artifactApi.togglePin` 與 `sessionApi.togglePin` 是同名的,拆開成
    `toggleArtifactPin` / `toggleSessionPin` 之後名字才明確。

  六個方法因此加上名詞(`publish` → `publishArtifact`、`getContent` →
  `getArtifactContent` 等),其餘原名不變。API 層只被 hooks 使用(7 個檔案、13 個呼叫
  點),改動範圍侷限在 `src/api/` 與 `src/hooks/` 之間。

- **`connectorApi` 的 73 行假目錄搬到 `src/mocks/handlers.connectors.ts`**(同上日期)。
  它原本 135 行裡有 73 行是 fixture、24 行是 localStorage 存取,**一行 HTTP 都沒有**
  ——一個假後端住在 runtime 層,違反 ADR-0006。現在它打真的 `GET /connectors`(mock 先
  行),剩 60 行。使用者自行新增的 custom source 仍留在 localStorage:把資料源加進
  **目錄**與把它附掛到**對話**是兩件事,只有後者有端點。
- 測試環境需要兩道 shim 才能跑,見 [ADR-0009](0009-two-test-environment-shims.md)。
