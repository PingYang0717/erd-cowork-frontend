# 0013. API 回應在 api 層以宣告式 contract 讀取,只驗存在與輕量型別,不引入 schema 函式庫

日期:2026-09-02

## 背景

在這之前,每個呼叫端各自防守、標準不一:`listArtifactShares` 對非陣列會 raise、
`searchDirectory` 對缺 `content` 會 raise,`useUpdateArtifactShares` 會 fallback,
`ResultTable` 用 `?? []` 吞掉,而 `listSessions` / `listArtifacts` / `getConfig` 完全
不檢查。三條實際存在的崩潰路徑證明「不檢查」不可行:

- `updatedAt` 若送成數字,session rail 的 `.localeCompare` 直接把整個 rail 打進
  ErrorBoundary;
- `getConfig` 若漏了 `retentionDays`,「超過 undefined 天」會被印進使用者看得到的
  句子;
- `pinnedAt` 若送成 `""`,`!== null` 為真,畫面顯示已釘選並排序到最前。

## 決策

1. **`src/api/responseContract.ts` 提供 `readObject` / `readArray` / `readArrayIn`,
   contract 與端點函式放在同一個 api 模組裡。** 壞掉的 body 不許離開 api 層——這是
   `listArtifactShares` 與 `searchDirectory` 既有做法的推廣。
2. **每個欄位宣告三件事,僅此三件**:存在(沒有 `fallback` 也沒有 `optional` 就是
   必要欄位,缺了 raise)、fallback(宣告它等於宣告「後端可以不給,畫面站得住」)、
   輕量 kind(`string` / `number` / `boolean` / `array` / `object`,加 `nullable`)。
   nullable string 的 `""` 讀為 null——對 timestamp 形狀的欄位,空字串就是後端的
   「沒有值」。
3. **必要欄位違約一律 raise `ResponseShapeError`**,含陣列中單一壞列(訊息帶
   index)。「讀不到」與「是空的」是不同的事實,靜靜少一列讀起來像「那筆被刪了」。
   有 fallback 的欄位型別不符時改用 fallback,但 `console.warn`——換值不出聲,
   等於畫面戴上後端沒說過的答案。
4. **不引入 zod / valibot。** 這裡是十來個端點,欄位型別在 `types/api` 已經宣告過
   一次;完整 schema 驗證是第二份會漂移的真相,和 ADR-0012 拒絕 i18n 函式庫是同
   一條理由。`Contract<T>` 的 mapped type 強制每個欄位都要表態(新增欄位沒決定
   規則就是編譯錯誤),這個保證已經是字典式的。
5. **contract 不准改名欄位、不准翻譯值、不准剝除未宣告欄位**(未宣告的原樣通過)。
   wire 契約逐字(ADR-0003),這一層永遠不得長成 translation layer。
6. 錯誤判讀同時收攏進 `src/api/apiError.ts`(`isOffline` / `isCanceled` /
   `httpStatus` / `errorCode` / `errorMessage`):axios 與 fetch 對「取消」各有拼法
   (`CanceledError` / `AbortError`),同一個事實不該由每個呼叫端各記各的。

## 後果

**得到**:形狀錯誤在 api 層邊界被攔下,帶著哪個讀取、哪個欄位的名字;可存活的
欄位其預設值寫在看得見的地方,而不是散在 `?? []` 裡。

**失去**:contract 與 `types/api` 的 interface 有一份受控的重複(欄位名列兩次)。
mapped type 保證兩邊不會漏——但保證不了 kind 標錯(`kind: 'string'` 配 number
欄位編譯得過),這靠 review。

**明確不做的**:enum 值驗證(`status` 收到未知值由 UI 的 default 分支處理)、
巢狀物件(只支援 `array of contract`)、mutation 回應的 contract(pin / rename
的回應是逐欄位套用,尚未納入)。要推翻第 4 條(升級成 schema 函式庫)時,重寫
的是全部 contract 宣告,不是呼叫端。
