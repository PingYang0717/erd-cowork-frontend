# 後端回饋清單

前端已依 [ADR-0003](../adr/0003-verbatim-backend-wire-contract.md) 對齊後端契約;
以下是對齊過程中確認**後端缺少、前端刻意不硬湊**的能力,依對使用者體驗的影響排序。
每一項在前端都有對應的降級行為,後端補上後前端只需小改。

## 高 — 分析條件表單([ADR-0004](../adr/0004-scenario-drives-clarification.md) 的核心)

1. **QUESTION 事件改送 `QuestionForm`**:目前扁平的 `Question[]` 表達不了欄位種類
   (六種)、`visibleWhen` 相依、選項附帶資訊(DC item 規格上下限)。前端現以
   `utils/liftQuestions.ts` 降級成一排 chip。
2. **`POST /sessions/{id}/messages` 接受結構化答案 `{ answers, inReplyTo }`**:目前
   答案組成自然語言送出,後端 LLM 需自行重新解析,且「已設定 N 項」摘要卡無法還原。

## 中 — 訊息與檔案

3. **訊息層級的附件記錄**:`Message.attachments`(送出當下 session 檔案的快照)是
   前端-only extension,真後端的歷史訊息不帶檔案資訊,bubble 上的附件 chips 因此不會
   出現在歷史訊息上。

## 中 — Connector 與 Directory

4. **Connector 端點**:`GET /connectors`、連線/斷線、新增自訂來源。目前是前端常數
   目錄疊上存在 localStorage 的使用者偏好(`erd-cowork:connector-prefs`),換一台
   機器就回到預設。連線狀態應該是帳號層級的事實——「已過期」「無權限」是全域的。
5. **`GET /directory`**:分享對話框的收件者搜尋,目前是 `artifactApi.listDirectory`
   回的一份固定名單。分享本身已接真後端,只有收件者來源還是假的。

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
