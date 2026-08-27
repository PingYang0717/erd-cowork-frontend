# 後端回饋清單

前端已依 [ADR-0007](../adr/0007-verbatim-backend-wire-contract.md) 對齊後端契約;
以下是對齊過程中確認**後端缺少、前端刻意不硬湊**的能力,依對使用者體驗的影響排序。
每一項在前端都有對應的降級行為,後端補上後前端只需小改。

## 高 — 分析條件表單(ADR-0006 的核心)

1. **QUESTION 事件改送 `QuestionForm`**:目前扁平的 `Question[]` 表達不了欄位種類
   (六種)、`visibleWhen` 相依、選項附帶資訊(DC item 規格上下限)。前端現以
   `utils/liftQuestions.ts` 降級成一排 chip。
2. **`POST /sessions/{id}/messages` 接受結構化答案 `{ answers, inReplyTo }`**:目前答案
   組成自然語言送出,後端 LLM 需自行重新解析,且「已設定 N 項」摘要卡無法還原。

## 中 — Session 管理

3. **Session CRUD**:建立(`POST /sessions`)、改名、釘選、刪除。目前這四個功能
   目前在 UI 上停用(ADR-0009);`Session.pinnedAt`(釘選時間戳,未釘選為 `null`)是前端-only 欄位。

## 中 — 檔案與訊息

4. **訊息層級的附件記錄**:`Message.attachments`(送出當下 session 檔案的快照)是
   前端-only extension,真後端的歷史訊息不帶檔案資訊,bubble chips 因此不會出現在歷史訊息上。

## 低 — Artifact 週邊

5. **Artifact 中繼資料端點**:清單(gallery)、pin、分享(`/share` + directory)、
   已生成標記(`/generate`)。版本已改為與後端一致的訊息推導模型(無端點);其餘是
   本專案相對 cowork-master 的領域價值,方向是後端補上而非前端砍掉
   (見 `docs/cowork-master-comparison.md` §5)。
6. **Artifact 內容的 theme 變體**:已結案(2026-08-28)——決議 Artifact HTML 不做
   theme 變體,前端已移除 `?theme=` query 與 postMessage 換色通道,後端無需動作
   (ADR-0001 狀態註記)。

## 已對齊、無需後端動作(記錄用)

- body `{ question, baseArtifactId }`、SSE 事件(含 ERROR 不斷流)、`GET /sessions/{id}`
  內嵌 messages/files、session 檔案 multipart 上傳/刪除、Artifact 內容 text/html、
  X-User-Id 身分。
