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
2. **沒有 response unwrap interceptor**:axios 回傳 `AxiosResponse<T>`,各 api 模組在
   呼叫點自己 `.then((res) => res.data)`。
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

## 後果

- internal 接入只需寫一份 `internal.impl.ts`,兩份前端通用;三支檔案與 cowork 的 diff
  應為零,上游演進時直接比對。
- 呼叫端多了一層 `.then((res) => res.data)` 的重複——這是同形的代價,刻意不包回去。
- 本專案其餘 api 模組維持物件風格(`artifactApi.getContent`),與 cowork 的具名函式
  風格並存。對齊範圍只含上列三支檔案,不擴。
- 測試環境需要兩道 shim 才能跑,見 [ADR-0009](0009-two-test-environment-shims.md)。
