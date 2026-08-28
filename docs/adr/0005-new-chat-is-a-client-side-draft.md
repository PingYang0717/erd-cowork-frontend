# 0005. New chat 是 client-side draft,session 由第一則訊息 upsert

日期:2026-08-28

## 背景

後端沒有 `POST /sessions`。`ChatSession` 實作 `Persistable<String>`,session id 由
client 指定,第一次送訊息(或上傳檔案)時 **upsert**;`GET /sessions/{id}` 在那之前
一律 404。

打一條不存在的端點做不到,而就算硬做,也會產生一批使用者從沒說過話的空 session。

## 決策

1. **New chat 不打任何 API。** 它產生一個 `crypto.randomUUID()`、把一份空的
   `SessionDetail` 殼寫進 query cache(`['sessions', draftId]`),然後選取它。
2. **草稿由推導判定,不另存狀態**:`isDraftActive` =「目前選取的 id 不在
   `GET /sessions` 回來的清單裡」。第一則訊息讓 session 落地之後,清單裡就有它了,
   草稿身分自動消失。
3. **`useSessionDetail` 的 `staleTime: Infinity`。** 草稿的 detail 只存在於 cache;
   任何背景 refetch 都會 404 並把整個對話串拆掉。所有寫入路徑改以 invalidate 觸發重抓。
4. **草稿列不提供 rename / pin / delete。** 草稿本身還沒有任何東西可以改名或刪除
   (session 的這三個操作對已落地的 session 是可用的,見後果)。
5. **草稿在側欄的位置不寫特例**:它的 `updatedAt` 是被開啟的當下,recency 排序自然讓
   它落在 Recents 第一筆。
6. **已在草稿中時再按 New chat 是 no-op。** 否則每按一次就在 cache 裡留下一個沒人指向
   的殼。

## 後果

- 語意與後端一致:session 是被訊息創造的,不是被按鈕創造的。
- 使用者可以開一個草稿卻從不送訊息,那個草稿在重新整理後就消失了——這是正確的,它從來
  沒有存在過。
- 草稿標題必須與後端的預設標題一字不差(`DRAFT_SESSION_TITLE = 'New analysis'`,對應
  後端 `SessionGuard.DEFAULT_SESSION_TITLE`),否則 session 落地的瞬間側欄標籤會跳動。
- Session 的改名、釘選、刪除對**已落地**的 session 已接真後端,只有草稿列不提供。
