# 給後端的問題清單:Artifact 的持有、釘選與排程

日期:2026-08-29。整理自 Artifact Gallery 改版(改以 session 為維度呈現)的設計討論。
每一題都是**前端無法自行決定、且會卡住設計**的點——不是功能許願,是契約上的模糊或缺口。

依阻塞程度排序。

---

## 1【最高】`Artifact.pinnedAt` 是全域欄位還是 per-user?

**契約現況矛盾。** `Artifact` 上 `pinnedAt` 是單一欄位:

```ts
/** 釘選的時間戳(ISO 8601),未釘選為 null。 */
pinnedAt: string | null;

/** Whether **the signed-in user** may pin this Artifact. A permission, decided by
 *  the backend — not a statement about whether the pin endpoint exists. */
canPin: boolean;
```

`canPin` 的措辭(「the signed-in user」)暗示釘選是**針對呼叫者**的,但 `pinnedAt`
只有一個值,讀起來像是 artifact 本身的屬性。兩者對不起來。

**為什麼卡住我們**:分享來的 Artifact(`isOwn === false`)如果被我釘選——

- 若 `pinnedAt` 是**全域**的 → 我改到了那份 artifact 的欄位,**擁有者會看到他的
  Artifact 被我釘了**。這是現在就存在的問題,與 Gallery 改版無關。
- 若是 **per-user**(同一份 artifact 對不同呼叫者回傳不同 `pinnedAt`)→ 一切通順,
  釘選是個人書籤。

**我們的立場:釘選應該是個人化行為。** 「我要常看這個」是讀者的事,不是物件的屬性;
一份被十個人分享的報表,十個人各自的釘選不該互相覆蓋。

**請確認**:`pinnedAt` 目前的實作是哪一種?若是全域,能否改為 per-user?

**前端的因應**:若確認要改 per-user,我們照現況實作即可(API 形狀不變,只是語意
釐清)。若短期不改,我們會在 `isOwn === false` 時**隱藏釘選入口**當臨時緩解——
但那會讓「把別人分享的報表加進我的常看清單」這件事做不到。

同一個問題也適用於 **`Session.pinnedAt`**(Studio 左欄的 Pinned 分組用它)。session
不會被分享,所以目前沒有暴露問題,但語意最好與 artifact 一致。

---

## 2【高】排程產出的 Artifact 屬於哪個 Session?

`ScheduleJob` 的型別已經在前端定義好(`id` / `title` / `cadence` / `lastRunAt` /
`status` / `scenario`),`/cowork/schedule` 頁面是佔位,後端無任何端點。

**為什麼現在要問**:Gallery 準備改成以 session 為維度呈現(見下方「設計脈絡」)。
排程不是對話,它產出的 Artifact 掛在哪裡會直接決定這個設計能不能成立:

| 做法                              | 後果                                      |
| --------------------------------- | ----------------------------------------- |
| 每次排程執行建一個新 session      | 每天一張卡,Gallery 又被淹沒,分組失去意義  |
| 排程綁定一個長壽 session,持續追加 | 分組成立,但後端要有「排程的目標 session」 |
| Artifact 的 `sessionId` 可為 null | 分組直接破功,需要另一種歸屬               |

**請確認**:Schedule 的資料模型預計怎麼設計?若尚未決定,希望能把這個約束納入考量。

---

## 3【中】`Artifact.type`(dashboard / slides)何時回到契約?

定版時暫時拿掉,至今未加回。**前端現況**:Gallery 卡片完全不顯示縮圖與 Dash/Deck
標籤——與其讓每張卡都預設成同一個猜測,不如都不顯示。

**請確認**:是否仍計畫加回?若是,欄位名與值域(`'dashboard' | 'slides'`)可否照
原定?

---

## 4【中】`GET /directory` — 分享的收件者名單

**目前是前端 stub**(`artifactApi.listDirectory` 回一份固定名單:部門碼、課別碼、
NT account)。而分享本身(`POST /artifacts/:id/share`)**已經上線**。

也就是說,現在的分享流程是「用假名單選人、打真的端點」。

**請確認**:

- `GET /directory` 的規劃?回傳形狀我們已定義為
  `{ id, kind: 'department' | 'section' | 'person', label }`。
- 更重要的:**分享的權限判斷在哪一層**?收件者名單是「組織全體」還是「我有權分享
  給的人」?後端會不會驗證 `targetIds` 的合法性?

---

## 5【中】分享的層級——每次產出都要重新分享一次嗎?

**現況**:分享綁在單一 Artifact 上。而每次迭代/排程執行都產生**新的 Artifact**
(版本即獨立 Artifact),所以昨天分享過的對象,對今天新產出的那一份**沒有存取權**。

以每日晨會為情境:三十天 = 三十次手動選收件者。

**請討論**:分享的對象應該綁在什麼層級?

- 綁 Artifact(現況)→ 每次重做
- 綁「同一份分析的所有版本」→ 需要 lineage 概念(見第 6 題)
- 綁 Session → 整串對話的產出對同一群人開放
- 綁 ScheduleJob → 排程設定一次,之後每次產出自動沿用(與第 2 題相關)

---

## 6【低,但影響長期】同一份分析的版本之間沒有任何關聯欄位

**現況**:版本不是後端資源。前端靠「同一個 session 裡帶 `artifactId` 的訊息順序」
推導版號(`deriveArtifactVersions`)。這帶來兩個已知限制:

- **版號會漂移**:刪掉中間某一版,後面全部往前挪(位置即版號)。
- **只有在 session 上下文裡推導得出來**:Gallery 沒有那個上下文,所以同一份分析的
  三個版本在 Gallery 是三張看起來幾乎一樣的卡。

**若未來要改善**,最小的後端改動是給 `Artifact` 加一個 lineage 欄位(例如
`rootArtifactId`,迭代時繼承)。這樣版號可以穩定、Gallery 可以摺疊、分享也能綁在
lineage 層(第 5 題)。

**這題不急**,但如果第 2、5 題要動資料模型,值得一起考慮。

---

## 附:設計脈絡(為什麼這些問題現在浮出來)

前端正在評估把 Artifact Gallery 從「每個 Artifact 一張卡」改成「每個 Session 一張
卡,點進去用既有的版本選單切換」。動機是每日晨會這類重複性情境——目前每天的產出都
是一張新卡,三十天後 Gallery 不可用。

這個改版**前端可以自己做**(`Artifact` 已帶 `sessionId` 與反正規化的
`sessionTitle`),但它把幾個原本模糊的語意推到了檯面上:釘選屬於誰(第 1 題)、
排程產出歸屬哪裡(第 2 題)、分享要不要跟著版本走(第 5 題)。

已經確定的邊界(不需後端配合):

- **`Shared to me` 維持扁平**——別人的 session 存取一律 404,分享來的 Artifact 本來
  就是一份獨立成品,沒有歷史可看。全頁檢視的程式碼已經這樣分岔(`isOwn === false`
  時不渲染版本選單,改顯示分享者與「Shared to me」標記)。
- **Artifact 是資料烤死的成品,不是版型**。資料在後端組裝時就注入 HTML,iframe 內的
  script 無法重新查詢。所以分享 = 分享那批資料的**快照**,權限判斷只在「能不能拿到
  這份 HTML」那一層。這點我們已理解並接受,列在這裡是為了確認雙方認知一致。

  **更正(2026-08-29 安全審查)**:先前這裡寫「CSP `connect-src 'none'` 讓 script
  完全無法發出請求」是過度宣稱。`connect-src` 擋 fetch/XHR/WebSocket,但**擋不住
  iframe 導覽自己**(`location.href = 'https://…?' + data`)——sandbox 缺
  `allow-top-navigation` 只擋頂層導覽,CSP 也沒有能擋這件事的指令。也就是說,一份
  惡意或被污染的 artifact **仍有外送資料的路徑**。這不改變「分享=快照」的結論,但
  改變了它的安全邊界:我們無法在前端保證 artifact 不外洩它收到的資料。**若這對
  fab 資料是不可接受的,需要後端在組裝時消毒 agent 產出的 HTML** — 這一項待雙方
  決策,見安全審查紀錄。
