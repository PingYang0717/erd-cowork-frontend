# 0011. apiClient / fileApi / bootstrap 與 cowork 上游檔案級對齊

日期:2026-08-28

## 狀態

Accepted。延續 [ADR-0010](0010-chat-panel-presentation-follows-cowork.md) 的對齊方向,
從呈現語彙擴及網路層接縫;對齊對象同為 cowork 上游前端
(`https://github.com/Michelle12369/cowork.git` 的 `frontend/`)。

## 背景

兩份前端接同一個後端,cowork 上游是 internal 部署實際走的那份。本專案的網路層與
cowork 逐步分歧:自己的 `identity.ts` 模組、response interceptor 統一拆 `data` 的
typed wrapper、`VITE_API_BASE_URL` 環境變數、手組 multipart + XHR 的上傳、以及
**完全沒有** internal 啟動接縫(SSO 在 mount 前決定身分的那道門)。每一項單看都有
理由,合起來的代價是:任何要在兩份前端之間搬動的 internal 接入
(`internal.impl.ts`、gateway header、Keycloak)都得寫兩種版本。

## 決策

`src/api/apiClient.ts`、`src/api/fileApi.ts`、`src/bootstrap/internal.ts` 三支檔案與
cowork 上游**檔案級同形**(非僅行為等價),連帶採納其契約:

1. **身分併入 `apiClient.ts`**:`getUserId` / `getAuthHeaders` / `setAuthHeaderProvider`,
   匿名 id 的 localStorage key 採 cowork 的 `erd_user_id`(既有瀏覽器的匿名身分歸零,
   確認無真實使用者後接受)。provider 回傳值語意是**完全取代**——回傳什麼就送什麼,
   「回傳 `{}` 讓 gateway 蓋 header」是其合法特例。provider 每次請求都被呼叫,不快取。
2. **unwrap interceptor 移除**:`apiClient` 回到 raw axios instance,各 api 模組在呼叫點
   `.then((res) => res.data)`。typed wrapper 的 DX 讓位給同形。
3. **base URL 寫死 `/api`**,`VITE_API_BASE_URL` 與 `.env` 刪除;dev/preview 由
   `vite.config.ts` proxy 到 `localhost:8080`。timeout 一併移除(上傳走 axios 後,
   10 秒會誤殺大檔)。
4. **上傳改 axios + `FormData` + `onUploadProgress`**,具名匯出。瀏覽器自行從磁碟
   串流 FormData,順帶修掉「整檔載入記憶體再複製一次」的問題(深度審查 P0-1)。
5. **internal 啟動接縫落地**:`src/bootstrap/internal.ts` 以 `import.meta.glob` 偵測
   `internal.impl.ts`(只存在於 internal 環境);`main.tsx` 在 mount 前
   `await initInternalRuntime()`,**刻意不 catch**——初始化失敗就不 mount,絕不以
   匿名身分繼續。

## 後果

- internal 接入只需寫一份 `internal.impl.ts`,兩份前端通用;三支檔案與 cowork 的
  diff 應為零,上游演進時直接比對。
- 呼叫端多了一層 `.then((res) => res.data)` 的重複——這是 verbatim 同形的代價,
  刻意不再包回去。
- 測試環境的已知限制:jsdom 的 `File` 經 MSW/undici 重組會降級成匿名 blob,
  wire 層檔名保真改由 `handlers.sessionFiles.test.ts` 以手組 multipart bytes 驗證,
  `fileApi` 的行為測試(進度、錯誤、回應解析)不受影響。
- 本專案其餘 api 模組維持物件風格(`artifactApi.getContent`),與 cowork 的具名函式
  風格並存——對齊範圍只含上列三支檔案,不擴。
