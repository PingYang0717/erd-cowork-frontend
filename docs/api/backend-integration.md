# 接上真實後端:設定與驗收指南

更新日期:2026-08-26。本文取代先前的「串接真實後端的注意事項」——那份文件記錄的
契約落差(body 形狀、Message 形狀、上傳模型、Artifact HTML、liveAdapter 死碼)已在
[ADR-0007](../adr/0007-verbatim-backend-wire-contract.md) 的 verbatim 對齊中全部解決,
線路型別即應用型別,**接真後端不需要改任何程式碼**。仍需後端配合的項目集中在
[backend-feedback.md](./backend-feedback.md)。

## 1. 切換開關(唯一必要的改動)

在 `.env`(或 `.env.local`)設定:

```
VITE_AGENT_TRANSPORT=live
VITE_API_BASE_URL=/api
```

機制(都已存在,不用動):

- `src/config/transport.ts` 讀取 flag(build-time,不是 runtime 開關——runtime 切換
  會把 MSW 打進 production bundle,見 ADR-0005)。
- `src/main.tsx`:live 模式下 MSW 仍啟動,但 `onUnhandledRequest: 'bypass'`。
- `src/mocks/handlers.ts` 的 `LIVE_BACKED` 清單(**method-aware**)決定哪些請求穿透:

| 穿透到真後端                                                    | 仍由 MSW 服務                                      |
| --------------------------------------------------------------- | -------------------------------------------------- |
| `GET /sessions`、`GET /sessions/{id}`(含 messages/files)        | `POST/PATCH/DELETE /sessions`(建立/改名/釘選/刪除) |
| `POST /sessions/{id}/messages`(SSE)                             | `/artifacts` 清單、pin、share、generate            |
| `POST /sessions/{id}/files`、`DELETE .../files/{fileId}`        | `/connectors`、`/dc-items`、`/directory`、schedule |
| `GET /artifacts/{id}`(text/html)、`POST /artifacts/{id}/repair` |                                                    |

同一路徑不同 method 各走各的:`GET /sessions/:id` 給後端、`PATCH /sessions/:id`
(改名/釘選,後端沒有)留在 MSW。

## 2. 網路層:讓 `/api` 到得了後端

`VITE_API_BASE_URL` 維持相對路徑 `/api`,dev 模式在 `vite.config.ts` 加 proxy
(假設後端在 8080):

```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true },
  },
},
```

**用 proxy,不要改成絕對 URL 直連**:直連需要後端開 CORS 並允許 `X-User-Id` header,
且 cookie/快取行為都變複雜;proxy 一律省事。

**SSE 專屬的坑**:proxy 或反向代理若有 response buffering,整條串流會一次到、
live bubble 永遠看不到逐步進度。Vite 的 http-proxy 預設不 buffer;正式環境的 nginx
要設 `proxy_buffering off`(後端有 15 秒 heartbeat,可順便當連線健檢)。

## 3. 第一次點通的驗收清單

依序驗,每一步都對應一條已對齊的契約:

1. **身分**:DevTools 確認每個請求(axios 與 `agentApi`/`fileApi` 的 raw fetch 兩條路)
   都帶 `X-User-Id`(`src/api/identity.ts`,localStorage 匿名 UUID)。後端依它過濾
   session,沒帶會拿到空清單或 404。
2. **讀路徑**:左欄 session 清單(`GET /sessions`)→ 點進去讀歷史
   (`GET /sessions/{id}`,messages/files 內嵌)。
3. **串流**:送一句話,live bubble 逐步出現(SSE 沒被 buffer)、樂觀 user bubble 即時
   顯示、結束後歷史 refetch 無縫接手、左欄排序更新。
4. **迭代**:右欄有 artifact 時追問一句,確認 body 帶 `baseArtifactId`、新結果落成
   下一個版本。
5. **中止**:串流中按停止,約 0.8–1.6 秒後歷史自動補上後端非同步落庫的訊息。
6. **檔案**:multipart 上傳、刪除、composer chips 顯示。
7. **Artifact**:右欄 iframe 渲染後端回的 text/html;repair 流程(錯誤收集 → offer 卡
   → `POST .../repair`)。

## 4. live 模式的已知降級(不是 bug,是記錄過的取捨)

- **反問表單降級成 chips**:真後端只送扁平 `Question[]`;六種欄位/`visibleWhen` 的
  富表單是 mock-only extension,`utils/liftQuestions.ts` 單向抬升。完整表單需後端改送
  `QuestionForm`(feedback #1)。
- **New chat 的短暫不一致**:mock 的 `POST /sessions` 建的 session 不在後端,第一次
  送訊息時後端以同 id upsert 才會進清單(feedback #3)。
- **bubble 附件 chips 消失**:真後端的歷史訊息不帶 `attachments` extension
  (feedback #4)。
- **深色 Artifact**:真後端無 `theme` 參數,只靠 iframe 內 postMessage 換色
  (ADR-0001;feedback #6)。
- **`GET /api/config` 尚未接**:`retentionDays` 沒被讀取,expired 檔案警示未實作。

## 5. 驗收後的下一步

- 把第 4 節的降級逐項拿去和後端對 [backend-feedback.md](./backend-feedback.md),
  依它的優先序排(QuestionForm 是分析條件表單能否活下來的唯一關鍵)。
- 正式部署時,反向代理照第 2 節設定 SSE 不 buffer,並確認 `/api` 前綴的轉發規則。
