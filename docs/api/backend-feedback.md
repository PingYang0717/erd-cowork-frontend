# 後端回饋清單

前端已依 [ADR-0003](../adr/0003-verbatim-backend-wire-contract.md) 對齊後端契約;
以下是對齊過程中確認**後端缺少、前端刻意不硬湊**的能力,依對使用者體驗的影響排序。
每一項在前端都有對應的降級行為,後端補上後前端只需小改。

## 高 — 分析條件表單([ADR-0004](../adr/0004-scenario-drives-clarification.md) 的核心)

1. **QUESTION 事件改送 `QuestionForm`**:目前扁平的 `Question[]` 表達不了欄位種類
   (四種)、`visibleWhen` 相依、選項附帶的說明。前端現以
   `utils/liftQuestions.ts` 降級成一排 chip。
2. **`POST /sessions/{id}/messages` 接受結構化答案 `{ answers, inReplyTo }`**:目前
   答案組成自然語言送出,後端 LLM 需自行重新解析,且「已設定 N 項」摘要卡無法還原。

## 中 — 訊息與檔案

3. **訊息層級的附件記錄**:`Message.attachments`(送出當下 session 檔案的快照)是
   前端-only extension,真後端的歷史訊息不帶檔案資訊,bubble 上的附件 chips 因此不會
   出現在歷史訊息上。

## 中 — 使用者與頭像

4b. **`GET /hr/userInfo` 待實作**,回單一物件(不包 `content` 信封):
`{ type: 'EMPLOYEE', employeeName, employeeNt, employeeOrgName, emplId }`。

4c. **頭像位址的樣板不要進前端 repo。** 前端目前用一個 placeholder 常數套 `emplId`
(`api/userApi.ts`)。真值是機密,寫死在原始碼裡等於進版控。兩條路都比它好:
讓 `GET /hr/userInfo` 直接回組好的 `avatarUrl`(前端連規則都不用知道),或把樣板
放進 `GET /config`。前者更好——後端同時知道 `emplId` 與樣板,沒有理由把拼裝這件事
交出來。

## 中 — Connector 與 Directory

4. ~~**Connector 端點**~~ — **已完成(2026-09-08 定版)**。`GET /connectors` 回
   `{ id, connectorName, description, type, enabled }`;哪一場對話在用哪些來源是
   session 的事實(`SessionDetail.connectors`),寫入走 `PATCH /sessions/{id}/data-source`
   ——裸陣列、整組取代、200 無 body。

   原本要求的「連線狀態是帳號層級的事實」已落地,但收斂成一個布林 `enabled`:「已過期」
   與「無權限」對前端要做的事完全一樣,而原因只有後端知道。**新增自訂來源這個設計確定
   不做**,`POST /connectors` 與 `PATCH /connectors/{id}` 一併從契約移除。留在
   localStorage 的只剩面板的預選值。

5. ~~**`GET /directory`**~~ — **已完成(2026-09-07 確認)**。收件者搜尋走真後端的
   `GET /hr/employeesAndOrgs?keyword=`(`api/directoryApi.ts`),回應包在 `content`
   信封裡,由該檔拆開。整份分享流程沒有假資料了。

## 低 — Artifact 週邊

0. **修復紀錄的用詞**(2026-09-02 新增):後端存下的修復紀錄前綴是「已修復**儀表板**執行
   錯誤」/「**儀表板**執行錯誤自動修復未成功」。前端已改口說 Artifact——`Artifact.type`
   不在契約裡,前端無從得知那個東西是 dashboard 還是 slides,寫「儀表板」是斷言一件查不到
   的事。兩者會出現在同一段對話串裡,用詞因此不一致。後端若要跟上,改成「Artifact」即可;
   注意那兩個字串是前端用來辨識訊息種類的比對值(`constants/wireStrings.ts` 的
   `REPAIR_RECORD_PREFIXES`),改動要同步。

1. **`Artifact.type`**(`'dashboard' | 'slides'`):契約定版時暫時拿掉,後端尚未加回。
   在它回來之前,Gallery 的縮圖與 Dash/Deck 標籤整個不顯示,而不是讓每張卡都預設成
   同一個錯答案。

## 已對齊、無需後端動作(記錄用)

- body `{ question, baseArtifactId }`、SSE 事件(含 ERROR 不斷流)、
  `GET /sessions/{id}` 內嵌 messages/files、session 檔案 multipart 上傳/刪除、
  Artifact 內容 text/html、`X-User-Id` 身分。
- Session 的改名、釘選、刪除皆已上線(pin 是切換式的 `POST /sessions/{id}/pin`)。
- Artifact 的清單、釘選、發布、刪除、分享皆已上線。
- **Artifact 的 theme 變體不做**:Artifact HTML 只有單一配色,前端沒有任何 theme
  參數或換色通道,後端無需支援(見
  [ADR-0001](../adr/0001-artifact-rendered-via-sandboxed-iframe.md))。

## ~~TABLE 事件希望補 `rowLimit`(2026-09-03)~~ — 整個事件退場(2026-09-08)

後端不再送 TABLE 事件,所以這一條連同它要問的東西一起沒有了。前端的渲染路徑
(`ResultTable`、`splitAnswerByTableMarkers`、reducer 的 `tables`)已全部移除,
`AgentEvent` 也不再有這個 variant。

原本:TABLE 只送 `truncated: boolean`,不送截斷筆數。前端曾寫死「(前 200 列)」——
那是前端獻上的、後端沒說過的數字,已改為不報數字的「(結果已截斷)」。若 TABLE 能帶
`rowLimit`(實際套用的上限),前端就能誠實地報出筆數。

## ~~mutation 的 404 語意不可分辨(2026-09-03)~~ — 前端已處理(2026-09-07)

原本:`describeActionError` 把 404/501 一起讀成「後端尚未就緒」,所以刪除一個已被刪的
session 會得到誤導訊息。

**前端這一側已解決**([ADR-0016](../adr/0016-error-copy-is-owned-by-the-frontend.md)):404 改說
「這個東西不在了」,而不見的是什麼由呼叫端給(`useActionErrorToast(notFoundCopy)`);501 才保留
「尚未就緒」。

**對後端的請求仍然成立,只是不再緊急**:若 404 一律帶 `code`(`SESSION_NOT_FOUND` /
`ARTIFACT_NOT_FOUND` …),這些 code 就能進 `errors.byCode`,呼叫端那個參數可以退場——現在是
10 個呼叫點各自挑一句話,挑錯不會有任何錯誤,它只是說錯話。

## UPLOAD_LIMIT 希望拆成三個 code(2026-09-07)

`UPLOAD_LIMIT` 同時代表三種情況:單檔超過上限、session 總量超過上限、檔案數超過上限。前端因此
只能給一句涵蓋三者的模糊話(「檔案超出可上傳的限制」),說不出實際撞到哪一條。拆成三個 code
(或在 body 多帶一個欄位說明是哪一項)前端就能講清楚。

## ~~前端的上傳限制與 `GET /config` 已經漂移~~ — 已解決(2026-09-07)

原本:`utils/uploadValidation.ts` 寫死 5 個檔、5 GB、`.csv,.xlsx,.xls`,而 `GET /config`
早已發布 `maxFiles` / `maxSessionBytes` / `singleFileLimits`。

**已改為讀 config。** 真正壞掉的其實不是「可能不同步」——前三項當時剛好對得上——而是
**`singleFileLimits` 的逐檔上限前端完全沒有檢查**:`csv: 2 GB`、`xlsx: 200 MB`、
`xls: 200 MB`,所以一個 500 MB 的 `.xlsx` 會通過前端、整份上傳完、才被後端擋下來。
現在送出前就擋住,並說得出是哪個檔、超過哪一條上限。

可接受的副檔名現在**就是 `singleFileLimits` 的 key**,不再有第二份白名單要跟著維護——
後端開始接受一個新型別並給它上限,前端自動跟上。

**保留了一組保底值**(`DEFAULT_UPLOAD_LIMITS`)。`GET /config` 不做 runtime 驗證
([ADR-0013](../adr/0013-api-response-contract.md)),漏送 `singleFileLimits` 會讓白名單
變空、每個檔案都被拒——那是防護失效成「全部擋下」,而使用者無能為力。保底值只在 config
形狀不可用時生效,不是第二份真相。

## BROWSER_REPAIR_UNSUPPORTED 尚未處理(2026-09-07)

409 `BROWSER_REPAIR_UNSUPPORTED` 代表「請求 browser-error 修復,但 provider 模式不支援」。這次
**刻意延後**,所以它目前落在未知 code 的泛用文案:使用者看到「操作失敗,請稍後再試」,不會知道
這個環境永遠不支援。

真正的解法是**事前不提議修復**——`CONTEXT.md` 對「修復(Repair)」的定義是「由系統偵測、向使用者
提議、經使用者確認」,在不支援的環境提議一件必定失敗的事,那個提議本身就是錯的。但前端現在沒有
任何管道知道:希望 `GET /config` 增加 `browserRepairSupported: boolean`。
