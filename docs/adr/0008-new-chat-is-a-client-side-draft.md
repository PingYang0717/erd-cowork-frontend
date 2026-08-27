# 0008. New chat 是 client-side draft,session 由第一則訊息 upsert

日期:2026-08-27

## 狀態

Accepted。延伸 [ADR-0007](0007-verbatim-backend-wire-contract.md) 的 hybrid 傳輸決策。

## 背景

後端沒有 `POST /sessions`。`ChatSession` 實作 `Persistable<String>`,session id 由 client
指定,第一次送訊息(或上傳檔案)時 **upsert**;`GET /sessions/{id}` 在那之前一律 404。

本專案原本的「New chat」打 `POST /sessions`,由 MSW 回一筆新 session。這在 mock 模式看起來
正常,在 live 模式是死路——那條端點不存在,而且就算硬做,也會產生一批使用者從沒說過話的空
session。

## 決策

1. **New chat 不打任何 API**。它產生一個 `crypto.randomUUID()`、把一份空的 `SessionDetail`
   殼寫進 query cache(`['sessions', draftId]`),然後選取它。
2. **草稿由推導判定,不另存狀態**:`isDraftActive` = 「目前選取的 id 不在 `GET /sessions`
   回來的清單裡」。第一則訊息讓 session 落地之後,清單裡就有它了,草稿身分自動消失。
3. **`useSessionDetail` 的 `staleTime: Infinity`**。草稿的 detail 只存在於 cache;任何背景
   refetch 都會 404 並把整個對話串拆掉。所有寫入路徑改以 invalidate 觸發重抓。
4. **草稿列不提供 rename / pin / delete**。這三個操作在後端都不存在,而且草稿本身還沒有
   任何東西可以改名或刪除。
5. **草稿在側欄的位置不寫特例**:它的 `updatedAt` 是被開啟的當下,recency 排序自然讓它落在
   Recents 第一筆。
6. **已在草稿中時再按 New chat 是 no-op**。否則每按一次就在 cache 裡留下一個沒人指向的殼。
7. `sessionApi.createSession` 與 MSW 的 `POST /sessions` 保留但不再被 UI 呼叫,標註為
   mock-only。

## 後果

- live 模式下「New chat」可用,而且語意與後端一致:session 是被訊息創造的,不是被按鈕創造的。
- 使用者可以開一個草稿卻從不送訊息,那個草稿在重新整理後就消失了——這是正確的,它從來沒有存在過。
- 草稿標題必須與後端的預設標題一字不差(`DRAFT_SESSION_TITLE = 'New analysis'`,
  對應後端 `SessionGuard.DEFAULT_SESSION_TITLE`),否則 session 落地的瞬間側欄標籤會跳動。
- Session 的改名、釘選、刪除在 live 模式仍然沒有後端(見
  [`docs/api/interface.md`](../api/interface.md));那是另一個問題,不因本決策而改變。
