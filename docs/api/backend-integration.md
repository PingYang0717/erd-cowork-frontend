# 接上真實後端:設定與驗收指南

更新日期:2026-08-27。本文取代先前的「串接真實後端的注意事項」——那份文件記錄的
契約落差(body 形狀、Message 形狀、上傳模型、Artifact HTML、liveAdapter 死碼)已在
[ADR-0007](../adr/0007-verbatim-backend-wire-contract.md) 的 verbatim 對齊中全部解決,
線路型別即應用型別,**接真後端不需要改任何程式碼**。仍需後端配合的項目集中在
[backend-feedback.md](./backend-feedback.md)。

## 1. 沒有開關了

前端只有一種模式:打真後端([ADR-0009](../adr/0009-no-mock-backend-at-runtime.md))。
`VITE_AGENT_TRANSPORT`、`src/config/transport.ts` 與 `LIVE_BACKED` 清單都已移除,MSW 只在
測試裡跑。`VITE_API_BASE_URL` 也已移除(2026-08-28,cowork 對齊):API base 寫死
`/api`,不吃任何環境變數。

後端還沒建好的端點,前端已各自表態,不需要任何設定:

| 類別           | 端點                                                                                                                                                         | 前端行為                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **stub**(讀取) | `GET /artifacts`、`GET /connectors`、`GET /directory`                                                                                                        | `src/api/` 回固定資料,不發請求    |
| **停用**(寫入) | `PATCH`/`DELETE /sessions/{id}`、`PATCH`/`DELETE /artifacts/{id}`、`POST /artifacts/{id}/share`、`POST /artifacts/{id}/generate`、`PATCH`/`POST /connectors` | UI 上 disabled,標「後端尚未支援」 |

後端補上其中一條時:把對應的 stub 換回 `apiClient` 呼叫,或把 UI 上的 `disabled` 拿掉
(api 函式都還在,`src/api/` 裡標註著)。同時復活 ADR-0009 附的那份測試清單。

## 2. 網路層:讓 `/api` 到得了後端

API base 寫死相對路徑 `/api`,dev/preview 模式由 `vite.config.ts` 的 proxy 轉發
(後端在 8080):

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

## 4. 已知降級(不是 bug,是記錄過的取捨)

- **反問表單降級成 chips**:真後端只送扁平 `Question[]`;六種欄位/`visibleWhen` 的
  富表單是 mock-only extension,`utils/liftQuestions.ts` 單向抬升。完整表單需後端改送
  `QuestionForm`(feedback #1)。
- **New chat 的短暫不一致**:草稿 session 只存在於這個分頁,第一次送訊息時後端以同 id
  upsert 才會進清單(ADR-0008;feedback #3)。
- **bubble 附件 chips 消失**:真後端的歷史訊息不帶 `attachments` extension
  (feedback #4)。
- **深色 Artifact**:已決議不做(2026-08-28)。`?theme=` query 與 iframe 內
  postMessage 換色通道皆已移除;Artifact HTML 只有單一配色(ADR-0001 狀態註記;
  feedback #6 已結案)。
- **`GET /api/config` 尚未接**:`retentionDays` 沒被讀取,expired 檔案警示未實作。

## 5. 驗收後的下一步

- 把第 4 節的降級逐項拿去和後端對 [backend-feedback.md](./backend-feedback.md),
  依它的優先序排(QuestionForm 是分析條件表單能否活下來的唯一關鍵)。
- 正式部署時,反向代理照第 2 節設定 SSE 不 buffer,並確認 `/api` 前綴的轉發規則。
