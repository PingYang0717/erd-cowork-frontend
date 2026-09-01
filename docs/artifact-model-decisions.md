# Artifact 模型設計決議(2026-08-31)

Artifact Gallery 改版的定案。**平坦化**——Artifact 是獨立的個體,不以 session 分組,
仿 Claude 的設計。本文記錄七項決議、各自的理由與代價、已實作的部分,以及卡在後端的部分。

先前評估過的「Gallery 以 session 為維度分組」**作廢**。

---

## 決議

### Q1 聊天迭代產生的是各自獨立的 Artifact

一個 session 裡先做「8 月良率 SPC 圖」、再說「加上 CPK 指標」,得到的是**兩個獨立的
Artifact**,不是同一份東西的 v1 → v2。各自可以發布、釘選、分享,各自在 Gallery 佔一
張卡。

**理由**:這與後端現況一致——迭代送 `baseArtifactId`,後端每輪回一個新的 artifact
resource。所以這塊零後端改動。

**代價**:同一份分析改了五次又都發布,Gallery 會有五張很像的卡。緩解需要 lineage
欄位(見「待後端」)。

### Q2 版本選單改為「此對話的產出」

Q1 之後,session 裡的產出是兄弟而非版本鏈,編號成 v1/v2/v3 讀起來像有 lineage,而那
個 lineage 不存在。選單保留(長對話裡跳回前面的產出是真實需求),但改成標題 + 時間 +
已發布勾記。

推導邏輯不變(帶 `artifactId` 的訊息依到達順序),只換呈現。`ArtifactVersion.version`
因此成為死欄位,已移除。

### Q3 發布是分享的前提

未發布的 Artifact 不能分享。發布 = 「這份東西可以給別人」。

**理由**:讓 publish 有單一清楚的意思,也讓 unpublish 自然地讀作「收回」。分享對話框
的文案本來就這樣寫。

**代價**:想快速給同事看一眼也得先發布。

### ~~Q4 unpublish 收回存取權~~ →(2026-09-01 修訂)沒有 unpublish

**取消發布這個動作不存在,它等同刪除。** Artifact 從架上拿下來和刪掉是同一件事,所以
只保留 Delete;提供兩個按鈕會變成同一個結果的兩種說法,而聽起來可以復原的那個其實
不能。

前端已移除 Gallery 卡片的 Unpublish 入口、`unpublishArtifact` API 與其 mutation、
以及 mock 的 `DELETE /artifacts/{id}/publish`。發布因此是單向的。

**仍然成立的部分**:刪除必須撤銷已發出的存取權(原本 Q4 的實質內容),這一條移到刪除
上,仍是後端需求。

### Q5 資料源綁在 session 上

connector 之後會變成類似 MCP tool、能自己打 API 取資料。而「這段對話用哪些資料源」是
**session 的狀態**,不是使用者的全域偏好。

- 檔案:`POST /sessions/{id}/files`(已存在)
- 資料源:`PATCH /sessions/{id}/data-source` 附掛、`DELETE` 卸除

語意分兩層:**目錄**說有哪些資料源、使用者能不能碰(`available` / `expired` /
`no_access`);**session** 說這段對話實際在用哪幾個。所以 `connected` 是關於 session
的事實,不是關於 connector 的。

### Q6 時間段版本:架構要支援,但這一期不做

「同一份 artifact 跑不同時間段的資料」是預想中的版本概念(與 Q1 的「獨立 Artifact」
是**不同的東西**)。手動重跑與排程自動跑**兩者都要能支援**,但系統設計尚未定案,這一
期不實作。

**架構約束**:lineage 的設計不能假設版本只有單一來源。版本記錄要能標示產生方式(手動
/ 排程),否則之後補排程會撞到。

### Q7 未發布的 Artifact 只活在對話串裡

Gallery 只放已發布的。沒發布的待在產生它的 session 對話串裡,靠 session 清單找回去。

**理由**:與「仿照 Claude」一致——Claude 的 artifact 就活在對話裡。也讓發布這個動作
有分量。

**代價**:「我上個月做過類似的東西」只能靠回想是哪個對話。

---

## 已實作(branch `fix/artifact-management`)

| 決議 | 實作                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------- |
| Q1   | 已是現況,無需改動                                                                                     |
| Q2   | 選單改「此對話的產出 · 共 N 個」,觸發鍵改「切換產出」;移除 `version` 欄位與兩條孤兒 CSS               |
| Q3   | ArtifactPanel 分享鍵未發布時 disabled,tooltip 說明。Gallery 卡片不需改——它只含已發布的                |
| Q4   | 已修訂:沒有 unpublish,Delete 就是它;卡片選單只保留 Delete                                             |
| Q5   | `useConnectors(sessionId)` join 目錄與 session 附掛;新增 `SessionDetail.dataSourceIds`;端點 mock 先行 |
| Q7   | Gallery 過濾 `publishedAt !== null`;mock 新增一份未發布 fixture 讓邊界被測到                          |

**另外**:收件者名單改打 `GET /hr/employeesAndOrgs?key=`(取代原規劃的 `GET
/directory`),滿 3 字元才搜尋、250ms debounce。從「抓完整份名單本地過濾」變成「輸入
才向後端搜尋」——目錄是全公司,本來就不該整份送到前端。

---

## 待後端

依阻塞程度排序。詳細問法見 `docs/api/backend-questions-artifact.md`。

1. **`Artifact.pinnedAt` 是否 per-user** — 契約自相矛盾,且是現在就存在的問題(釘選
   別人分享來的 Artifact 會改到擁有者的資料)。
2. **刪除的撤銷語意** — 刪除一個已分享的 Artifact,收件者的連結必須立即失效(原為
   unpublish 的語意,Q4 修訂後移到刪除上)。
3. **`data-source` 端點** — 目前 mock 先行。**待確認**:`DELETE` 的 `connectorId` 走
   request body(現行實作)還是 query / path?
4. **lineage 欄位**(如 `rootArtifactId`)— 從「低優先」升格為 Q6 的**必要條件**。
5. **重跑端點** — 「用這份 artifact 的邏輯跑另一個時間範圍」,Q6 的另一個必要條件。
6. **排程綁定 artifact** — `ScheduleJob` 需要 `artifactId` 欄位(Q6 的排程那一半)。
7. **`GET /hr/employeesAndOrgs` 的權限層級** — 回傳的是「組織全體」還是「我有權分享
   給的人」?後端會不會驗證 `targetIds`?

---

## 前端已知的臨時處置

- **`SessionDetail.dataSourceIds` 標為 optional**,使用端預設空陣列。後端還沒回這個
  欄位,少了它應該讀作「沒有附掛任何資料源」而不是讓整個 thread 崩掉。欄位上線後改回
  必填。
- **自訂資料源仍存在 localStorage**。把資料源加進**目錄**與把它附掛到**對話**是兩件
  事,只有後者有端點。新增時兩件一起做(新增即是選用)。
