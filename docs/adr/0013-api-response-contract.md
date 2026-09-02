# 0013. API 錯誤判讀統一於 apiError;response contract 曾採用、已撤回

日期:2026-09-02(2026-09-03 撤回 contract 部分)
狀態:錯誤判讀部分已採納;回應驗證部分已撤回

## 仍然成立的:錯誤判讀收攏於 `src/api/apiError.ts`

在這之前,「這是什麼錯」散在六處各問各的:`describeLoadError` 直接問 axios、
`useArtifactRepair` 自己挖 `response.data.code`、「請求被取消」在一個檔案拼作
`CanceledError`(axios)、另一個拼作 `AbortError`(fetch)——同一個事實,依傳輸
各記各的。

`apiError.ts` 提供五個判讀:`isOffline` / `isCanceled` / `httpStatus` /
`errorCode` / `errorMessage`,認得 axios、raw fetch(agent stream)與後端自己的
`{ code, message }` body 三種長相。取消判斷以 `name` 而非 `instanceof Error`——
fetch 的 abort 是 DOMException,跨 realm(測試的 jsdom、瀏覽器的 frame)過不了
instanceof,name 在哪裡都誠實。

## 已撤回的:宣告式 response contract

2026-09-02 曾引入 `responseContract.ts`(readObject / readArray,每欄位宣告
存在 / fallback / 輕量 kind),接上全部讀取端點與 artifact pin。**2026-09-03
撤回**:呼叫端變成 `apiClient.get('/artifacts').then(asArray(ARTIFACT))` 或
`readArray(await apiClient.get<unknown>(...), ...)`,回傳型別藏在 contract 後面,
直觀性被判定比 runtime 驗證重要。回到原本的寫法:

```ts
export const listArtifacts = () => apiClient.get<Artifact[]>('/artifacts');
```

**隨撤回而接受的風險**(當初 contract 要擋的三類真實崩潰路徑):

- 後端漏送 `retentionDays` → 「超過 undefined 天」印進使用者看得到的句子;
- `updatedAt` 送成數字 → session rail 的 `.localeCompare` 把整個 rail 打進
  ErrorBoundary;
- `pinnedAt` 送成 `""` → `!== null` 為真,畫面顯示已釘選並排到最前。

`types/api` 的 interface 回到唯一防線(編譯期,不驗 runtime)。要重新引入驗證時
先讀這一節——上一輪撤回的原因是呼叫端形狀,不是保護本身沒有價值。

## 撤回時保留的周邊修正(與 contract 無關)

- `listArtifactShares` 與 `searchDirectory` 原有的手寫形狀防守(raise 而非空清單)
  維持原樣——那是 contract 之前就存在的決定。
- artifact pin 的 cache 寫入維持**合併語意**:`owner` / `isOwn` 在回應裡才套用
  (`ArtifactPinResult` 型別的 optional 如實描述),部分回應不再以 undefined 覆蓋
  cache——isOwn: undefined 是 falsy,曾讓自己的 Artifact 變成「分享給我的」。
- repair 端點住在 `artifactApi`(依層放),`BrowserJsError` 是它的 body 形狀,
  隨之定義在 api 層。
