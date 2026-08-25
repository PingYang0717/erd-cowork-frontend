# 串接真實後端的注意事項

本文盤點「把 master 接上真實後端」實際要動的東西。基準是 `docs/cowork-master-comparison.md`
第 2 節列出的後端端點（Spring Boot + MongoDB + FastAPI deepagent，共 11 條），以及 master
當下的程式碼狀態。

前提與 comparison 文件相同：**兩份前端要接同一個後端**。契約的單一事實來源仍是
[`docs/api/interface.md`](./interface.md)，本文只談「從 mock 走到 live 之間缺什麼」。

---

## 0. 一句話結論

架構已經預留好接線點（`config/transport.ts` 的 build-time 開關、`api/liveAdapter.ts`、
`api/identity.ts`），但**真正的接線幾乎都還沒做**。現在直接開 `VITE_AGENT_TRANSPORT=live`
會比 mock 模式更壞——見第 2 節。

---

## 1. 現況盤點

`docs/cowork-master-comparison.md` 第 5 節的第一階段四項，目前完成一項：

| 項目                                  | 狀態 | 位置                                                          |
| ------------------------------------- | ---- | ------------------------------------------------------------- |
| `X-User-Id` request interceptor       | ✅   | `api/identity.ts`、`api/apiClient.ts:12-15`                   |
| `text` → `question` 的 body 轉換      | ❌   | `api/agentApi.ts:48-58` 仍送本專案的 body                     |
| 從 `GET /sessions/{id}` 拆出 messages | ❌   | `api/messageApi.ts` 仍打 `GET /sessions/:id/messages`         |
| Artifact 內容改吃 `text/html`         | ❌   | `api/artifactApi.ts:19-22` 仍期待 `{ html }` JSON + `?theme=` |
| ErrorBoundary（第 4 節缺口）          | ✅   | `components/common/ErrorBoundary.tsx`                         |

身分那條是完整的：axios interceptor 與 `agentApi` 的 raw fetch 共用 `getAuthHeaders()`，
串流那條路不會漏 header。

### ⚠️ `api/liveAdapter.ts` 目前是死碼

這是最容易被誤判成「已經接好」的地方。`liveAdapter.ts` 寫完了、也有 `liveAdapter.test.ts`，
但全 repo grep 過，`toMessage()` / `toAgentEvent()` / `toQuestionForm()` **沒有任何 call path
呼叫**：

- `hooks/useMessages.ts` 直接吃 `messageApi.listMessages()` 的原始回應
- `hooks/useAgentStream.ts` 直接吃 `streamAgentMessage()` yield 出來的原始 event

所以 live 模式下後端的 `sender: 'USER'` / `stepsJson` / `questionsJson` / `artifactTitle`
都不會被轉換，QUESTION 事件的形狀也不會被抬升。**接線的第一步就是把這個 adapter 真的插進
這兩條路。**

---

## 2. 阻斷級：現在打開 live 會壞掉的東西

### 2.1 `LIVE_BACKED` 移除的攔截，後端接不住

`mocks/handlers.ts:387-392` 在 live 模式下會停止攔截這四條：

```
/api/sessions
/api/sessions/:id
/api/sessions/:sessionId/messages
/api/uploads
```

但後端實際上**只有** `GET /api/sessions`、`GET /api/sessions/{id}` 與
`POST /api/sessions/{id}/messages`。以下全部不存在：

| 前端會打的                   | 後端有嗎 | 壞掉的功能                                                |
| ---------------------------- | -------- | --------------------------------------------------------- |
| `POST /sessions`             | ❌       | New chat                                                  |
| `PATCH /sessions/:id`        | ❌       | Session 改名、釘選                                        |
| `DELETE /sessions/:id`       | ❌       | Session 刪除                                              |
| `GET /sessions/:id/messages` | ❌       | 訊息清單（messages 包在 `GET /sessions/{id}` 裡）         |
| `POST /uploads`              | ❌       | 附件上傳（後端是 `POST /sessions/{id}/files`，multipart） |

**live 模式等於把 MSW 關掉、換成 404**，五個功能一次全死。在第 4 節的 adapter 補完之前，
這比留著 mock 還糟。

### 2.2 文件與程式碼不一致（兩處）

- `docs/api/interface.md` 的「傳輸模式與 live 端點覆蓋範圍」與 `README.md` 都寫著 live 模式下
  **Artifact HTML 與 repair 走真後端**，但 `LIVE_BACKED` 裡沒有 `/api/artifacts/:id`，也沒有
  `/api/artifacts/:id/repair`——實際上仍由 MSW 服務。文件或程式碼要挑一邊改，目前兩邊互相矛盾。
- `main.tsx:11` 是 `if (!import.meta.env.DEV) return;`，**production build 完全不啟動 MSW**。
  而 Artifacts 總覽、分享、Directory、Connectors、DC item、Artifact 版本這六組端點後端沒有、
  只有 MSW 有。所以 **live 模式目前只能在 dev server 跑，一 build 出去這些頁面全部 404**。
  這件事現有文件沒有寫明，部署前必須先決定怎麼處理（後端補端點、或 prod 也帶一份 MSW、
  或把這些頁面在 prod 關掉）。

---

## 3. 環境與部署

### 3.1 一定要用 proxy，不要改 `VITE_API_BASE_URL` 成絕對 URL

`vite.config.ts` 目前沒有 `server.proxy`。`.env.example` 的 `VITE_API_BASE_URL=/api` 假設同源，
但後端是另一個 service。這裡有個陷阱：

> MSW 的 handler 全部註冊在**相對路徑** `/api/*`。一旦把 `VITE_API_BASE_URL` 改成
> `http://backend:8080/api`，這些 handler **會全部失配**——連 live 模式下仍該由 MSW 服務的
> 那六組端點也一起死。

正確做法：

- **dev**：`VITE_API_BASE_URL` 維持 `/api`，在 `vite.config.ts` 加 `server.proxy` 把 `/api`
  轉到後端。順帶解決 CORS。
- **prod**：同樣維持同源，由 nginx / gateway 反向代理 `/api`。

### 3.2 身分

v1 是 localStorage 的匿名 UUID（`erd-cowork:user-id`）。部署到 internal 環境時，SSO / gateway
會在請求經過時注入 `X-User-Id`，此時要用 `setAuthHeaderProvider(() => ({}))` 安裝一個回傳空
物件的 provider，讓瀏覽器不要覆蓋掉 gateway 蓋的值。接縫只有 `api/identity.ts` 這一處。

---

## 4. 契約落差：要後端配合的部分

以下不建議在前端硬湊，應該先送契約提案。嚴重度沿用 comparison 文件第 3 節。

### 4.1 QUESTION 事件形狀不同　🔴

九種 agent event 裡有八種逐欄一致（這正是事件名維持 SCREAMING_CASE 的用意），QUESTION 不是：

|          | 本專案                                     | 後端                        |
| -------- | ------------------------------------------ | --------------------------- |
| 承載     | `{ form: QuestionForm }`                   | `{ questions: Question[] }` |
| 欄位種類 | 六種                                       | 無                          |
| 欄位相依 | `visibleWhen`                              | 無                          |
| 選項     | `{ value, label, hint?, unit?, lo?, hi? }` | `string`                    |
| 答案回傳 | `{ answers, inReplyTo }` 結構化            | 組成自然語言當新訊息送出    |

`toQuestionForm()` 的抬升**只有這個方向可行，而且會失真**：欄位種類（於是全變成 chip）、
欄位相依（於是 CP Test 的 Flow / Loop 無法依角色顯示）、選項附帶的規格上下限（於是 DC item
帶不了 `lo` / `hi`）全部表達不了。

**這是四套分析條件表單能不能在 live 模式活下來的唯一關鍵。** 後端必須改成送
`QuestionForm` 本身。

### 4.2 送出訊息的 body 對不上　🔴

後端是 `SendMessageRequest(String question, String baseArtifactId)`。本專案送
`{ text, scenarioKey?, artifactKind?, attachments?, answers?, inReplyTo? }`。

- `text` → `question` 只是改名，adapter 可以吸收。
- `scenarioKey` / `artifactKind` / `answers` / `inReplyTo` **後端沒有這些概念**。

沒有 `answers` / `inReplyTo`，反問卡就送不回任何東西，四套 Scenario 在 live 模式全部退化成
一段自由文字。

### 4.3 Session 是 upsert 不是 CRUD　🟠

Session id 由 client 指定，第一次送訊息時 upsert，沒有建立／改名／釘選／刪除端點。

### 4.4 Artifact 內容是 HTML 且沒有 theme 參數　🟠

後端 `GET /api/artifacts/{id}` 直接回 `text/html`；本專案期待 `{ html: string }` 並用
`?theme=light|dark` 取對應配色。深色模式在 live 下只剩 `postMessage` 那條路（ADR-0001 已有），
重新抓取換色的主路徑不存在。

### 4.5 上傳模型不同　🟠

後端是 session 層級的 multipart（有刪除、配額、保留期），本專案是訊息層級的 JSON metadata。
訊息層級的模型嚴格更強（Round 2 Q7 的決定，理由仍成立），但要接同一個後端，得在 adapter 層
把「訊息上的附件」還原成「session 的檔案清單」，並把配額與過期狀態揭露到 UI。

### 4.6 沒有讀 `GET /api/config`　🟡

`retentionDays` 沒有被讀取，所以檔案保留期無法顯示。

---

## 5. 建議動手順序

### 第一批——只動 adapter 與設定層，不碰 UI

1. `vite.config.ts` 加 `server.proxy` 把 `/api` 轉到後端；`VITE_API_BASE_URL` 維持 `/api`（§3.1）
2. 修正 `LIVE_BACKED`（§2.1、§2.2）：
   - **拿掉** `POST /sessions`、`PATCH`/`DELETE /sessions/:id`、`/api/uploads`，讓 MSW 繼續服務
   - **加上** `/api/artifacts/:id`、`/api/artifacts/:id/repair`，與文件對齊
3. 把 `liveAdapter` 真正接上（§1）：
   - `messageApi.listMessages` 在 `isLive` 時改打 `GET /sessions/:id`，取 `.messages.map(toMessage)`
   - `agentApi` yield 前包一層 `toAgentEvent`
4. `agentApi` 送出時 `text` → `question`（§4.2 的可解部分）
5. `artifactApi.getContent` 在 live 時 `responseType: 'text'` 取 `text/html`，包成 `{ html }`（§4.4）

### 第二批——先送契約提案給後端

6. QUESTION 改送 `QuestionForm` 本身（§4.1）
7. `POST /messages` 接受 `answers` / `inReplyTo`（§4.2）
8. Session 的建立／改名／釘選／刪除（§4.3）

### 第三批——本專案自己的洞

9. 上傳模型對齊 + 配額與保留期揭露（§4.5、§4.6）
10. `baseArtifactId` 的 UI 入口與 raw HTML 迭代路徑
11. Schedule 頁面

---

## 6. 驗收方式

第一批做完後，`VITE_AGENT_TRANSPORT=live npm run dev` 應該要能：

- [ ] 開啟後 Session 清單從後端載入，且只看得到自己（`X-User-Id`）的 session
- [ ] New chat、改名、釘選、刪除仍可用（由 MSW 服務，不是 404）
- [ ] 送出一段自由文字，SSE 串流的九種事件都正確渲染，步驟卡的 ERROR 態仍會出現
- [ ] 重新整理後訊息歷史從 `GET /sessions/{id}` 還原，`sender` / `stepsJson` 都轉換正確
- [ ] Artifact 面板能載入後端回的 HTML
- [ ] Artifacts 總覽、Connectors、Directory、版本切換仍由 MSW 正常運作

反問表單在 §4.1 完成前**預期會退化成一排 chip**，這不是 bug，是已知的契約落差。

---

## 7. 不建議做的事

把 Connector、Artifacts 總覽、分享、Artifact 版本這些搬去遷就後端。它們是本專案相對於
`cowork-master` 的全部領域價值，正確方向是後端補上，而不是前端砍掉。
