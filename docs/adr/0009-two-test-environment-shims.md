# 0009. 測試環境的兩道 shim:身分預種與 FormData 序列化

日期:2026-08-28

## 背景

測試在 jsdom 裡跑,HTTP 由 MSW(底層是 undici)攔截。這條路徑與真實瀏覽器有兩處不
一致,而兩處都是在 [ADR-0007](0007-cowork-file-parity-for-api-seams.md) 把 apiClient
與 fileApi 改成 cowork 同形之後才浮現的:

1. `getUserId` 不再有記憶體快取(cowork 同形),每次直讀 `localStorage`。而 setup 會在
   每個測試後 `localStorage.clear()`,mock fixtures 又在**模組載入時**就捕捉
   `currentUser.id` 當作種子 Artifact 的 `ownerId`。三者相加的結果是:id 會在檔案中途
   被重新鑄造,於是 `isOwn`、pin、publish 這些擁有權判斷全部靜靜地翻面。
2. jsdom 的 `File` 經 MSW/undici 重組時會被降級成匿名 blob——**檔名消失**。真瀏覽器
   序列化 `FormData` 時檔名當然都在。

兩者都不是產品程式碼的錯,而應用層也沒有能修的地方。

## 決策

**在測試 setup 裝兩道 shim,產品程式碼不為測試環境讓步。**

- **`src/test/seedTestIdentity.ts`** — 固定匿名 user id,並且是 `setup.ts` 的**第一個
  import**,在 mocks 的模組圖載入之前執行;`afterEach` 清完 localStorage 後也重新種
  一次。**動 `setup.ts` 的 import 順序前必須先讀這個檔的註解**:順序本身就是正確性。
- **`src/test/formDataWire.ts`** — 一個 test-only 的 axios request interceptor,把
  `FormData` 預先序列化成與瀏覽器等價的 multipart bytes,讓 mock 後端讀到真實的 wire。

**Mock 端的解析器另以獨立來源驗證。** `handlers.sessionFiles.test.ts` 自己手組
multipart bytes,不經過 `fileApi` 也不經過上面那道 interceptor——否則就變成用 shim 驗
shim,兩邊一起錯也看不出來。

## 後果

- `src/api/fileApi.ts` 維持 cowork 同形的 `FormData` 路線,沒有為了測試改寫成手組
  multipart。
- 測試環境多了兩個必須理解才能安全修改的前提。它們寫在 `src/test/README.md` 與各自
  檔案的註解裡。
- 若哪天 jsdom 或 undici 修好了 `File` 的行為,`formDataWire.ts` 可以直接移除,
  `handlers.sessionFiles.test.ts` 不受影響。
