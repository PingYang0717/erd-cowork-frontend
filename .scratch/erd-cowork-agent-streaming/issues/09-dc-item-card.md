# 09: DC item 卡與流程中反問

**What to build:** When an SPC run finds too many DC Items to chart, it stops and asks which ones to do first.

**Blocked by:** 06, 07

**Status:** ready-for-agent

> 取代 `.scratch/erd-cowork-frontend/issues/18-dc-item-picker.md`（deferred）。設計稿定義：`eRDWorkspace20260819.html:83224-83480`、流程文案 `:10290-10370`

- [ ] SPC 腳本在「掃描 wafer / DC item」步驟後推出第二個 QUESTION 事件，intro 文案帶入項數與筆數：「約 N 個 DC item(約 M 筆),資料量偏大。要先看哪些 DC Item?可勾選或自行輸入。」
- [ ] `dcitem` field kind 的專屬元件：可搜尋清單（placeholder「搜尋 DC item…」）、多選勾選、顯示各項的單位與上下限（`DcItem.unit` / `lo` / `hi`）
- [ ] 自訂新增輸入（placeholder「自訂 DC item…」），加入後即為已選
- [ ] 建議提示：「建議先選 3–5 項快速出圖確認;沒問題我再一次幫你補上其餘或全部 N 項」；項數偏多時改用「…張數較多、產生會久一點。建議先留 3–5 項快速確認…」變體
- [ ] 送出鈕文案「先產生這 N 項」，未選任何項時 disabled 並顯示「至少選一項」；已選時顯示「已選 N 項」
- [ ] 送出後串流繼續，出現「過濾至選定 DC item」步驟，最終 Artifact 只含選定項目
- [ ] `docs/api/interface.md` 補上 DC item 清單／自訂新增端點；`types/api/dcItem.ts` 定案
- [ ] Seam test：跑一次 SPC，斷言條件表單送出後串流繼續並在中途出現 DC item 卡；搜尋、勾選、自訂新增、送出，斷言後續步驟與 Artifact 反映選定項目
