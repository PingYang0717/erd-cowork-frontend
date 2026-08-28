# 接上真實後端:設定與驗收指南

線路型別即應用型別([ADR-0003](../adr/0003-verbatim-backend-wire-contract.md)),
**接真後端不需要改任何程式碼**。仍需後端配合的項目集中在
[backend-feedback.md](./backend-feedback.md)。

## 1. 沒有開關

前端只有一種模式:打真後端([ADR-0006](../adr/0006-no-mock-backend-at-runtime.md))。
沒有傳輸模式開關,也沒有任何環境變數——API base 寫死 `/api`,MSW 只在測試裡跑。

後端還沒建好的端點,前端已各自表態,不需要任何設定:

| 類別                  | 端點                             | 前端行為                                          |
| --------------------- | -------------------------------- | ------------------------------------------------- |
| **stub**(讀取)        | `GET /directory`                 | `src/api/` 回固定資料,不發請求                    |
| **localStorage 偏好** | `GET`/`PATCH`/`POST /connectors` | 前端常數目錄 + 使用者選擇存 localStorage,不發請求 |
| **無入口**            | `DELETE /artifacts/{id}/publish` | 契約與函式都在,UI 上還沒有觸發點                  |

其餘端點都已接上真後端。後端補上 stub 那幾條時:把 `src/api/` 裡的固定資料換回
`apiClient` 呼叫即可(函式與型別都已就位)。

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

1. **身分**:DevTools 確認每個請求(axios interceptor 與 `agentApi` 的 raw fetch 兩條路)
   都帶 `X-User-Id`(`src/api/apiClient.ts` 的 `getAuthHeaders()`,localStorage 匿名
   UUID,key `erd_user_id`)。後端依它過濾 session,沒帶會拿到空清單或 404。
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
  upsert 才會進清單。這是決策不是缺口,見
  [ADR-0005](../adr/0005-new-chat-is-a-client-side-draft.md)。
- **bubble 附件 chips 消失**:真後端的歷史訊息不帶 `attachments` extension
  (feedback #3)。
- **深色 Artifact 不做**:Artifact HTML 只有單一配色,前端沒有任何 theme 參數或換色
  通道([ADR-0001](../adr/0001-artifact-rendered-via-sandboxed-iframe.md))。深色模式
  只作用在 app 本身,右側面板在深色下仍是亮的。
- **Connector 是本機偏好**:選了哪些資料來源存在 localStorage,換一台機器就回到預設
  (feedback #4)。

## 5. 驗收後的下一步

- 把第 4 節的降級逐項拿去和後端對 [backend-feedback.md](./backend-feedback.md),
  依它的優先序排(QuestionForm 是分析條件表單能否活下來的唯一關鍵)。
- 正式部署時,反向代理照第 2 節設定 SSE 不 buffer,並確認 `/api` 前綴的轉發規則。
