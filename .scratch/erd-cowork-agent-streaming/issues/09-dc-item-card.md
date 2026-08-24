# 09: DC item 卡與流程中反問

**What to build:** When an SPC run finds too many DC Items to chart, it stops and asks which ones to do first.

**Blocked by:** 06, 07

**Status:** ready-for-agent

> 取代 `.scratch/erd-cowork-frontend/issues/18-dc-item-picker.md`（deferred）。設計稿定義：`eRDWorkspace20260819.html:83224-83480`、流程文案 `:10290-10370`

- [x] SPC 腳本在「掃描 wafer / DC item」步驟後推出第二個 QUESTION 事件，intro 文案帶入項數與筆數：「約 N 個 DC item(約 M 筆),資料量偏大。要先看哪些 DC Item?可勾選或自行輸入。」
- [x] `dcitem` field kind 的專屬元件：可搜尋清單（placeholder「搜尋 DC item…」）、多選勾選、顯示各項的單位與上下限（`DcItem.unit` / `lo` / `hi`）
- [x] 自訂新增輸入（placeholder「自訂 DC item…」），加入後即為已選
- [x] 建議提示：「建議先選 3–5 項快速出圖確認;沒問題我再一次幫你補上其餘或全部 N 項」；項數偏多時改用「…張數較多、產生會久一點。建議先留 3–5 項快速確認…」變體
- [x] 送出鈕文案「先產生這 N 項」，未選任何項時 disabled 並顯示「至少選一項」；已選時顯示「已選 N 項」
- [x] 送出後串流繼續，出現「過濾至選定 DC item」步驟，最終 Artifact 只含選定項目
- [x] `docs/api/interface.md` 補上 DC item 清單／自訂新增端點；`types/api/dcItem.ts` 定案
- [x] Seam test：跑一次 SPC，斷言條件表單送出後串流繼續並在中途出現 DC item 卡；搜尋、勾選、自訂新增、送出，斷言後續步驟與 Artifact 反映選定項目

## Comments

**2026-08-25:** 完成。三件實作時的判斷：

1. **`submitLabel` 支援 `{count}` 佔位符。** 「先產生這 N 項」的 N 隨勾選即時變動，
   而 `submitLabel` 是後端送來的靜態字串——由卡片自己內插，後端不必為每次勾選重送表單。
   送出鈕旁的提示在可送出時從 `disabledHint` 換成「已選 N 項」，照 mockup。
2. **搜尋框與自訂輸入必須有不同的可及名稱。** DC item 欄位兩者都有（「搜尋 DC item…」
   與「自訂 DC item…」），撞名會讓查詢抓到兩個。欄位本名留給真正回答它的輸入，搜尋框
   改成「搜尋 {欄位名}」。新增 `QuestionField.customPlaceholder`。
3. **選項標籤帶上規格上下限**（`Vt (gate CD) · 0.28 – 0.34 V`），工程師不必另外查就能
   判斷要不要選。自訂項目沒有上下限，只顯示名稱。

SPC 的步驟數因此從 3 變成 5（掃描 + 過濾），slides 從 4 變成 6。既有測試的期待值已更新。
