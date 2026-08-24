# 07: SPC / Inline 分析條件表單

**What to build:** Clicking SPC analysis or Inline dashboard collects the analysis conditions before anything runs.

**Blocked by:** 06

**Status:** ready-for-agent

> 設計稿定義：`eRDWorkspace20260819.html:82887-83010`；Time range 選項陣列 `:9315`

- [ ] Part ID：多選，搜尋／貼上輸入，placeholder「輸入關鍵字搜尋,可多選或貼上…」
- [ ] Time range：單選 chips `Last 24h` / `Last 7 days` / `Last 30 days` / `Last quarter`，下方自訂輸入，placeholder「或自訂,例如 07/01–07/31、last 3 shifts…」；填了自訂值時輸入框邊框轉為 primary
- [ ] Data type：多選 chips，選項＝當下 `status === 'connected'` 的 Connector 名稱，無任何連線時 fallback `["Inline"]`
- [ ] Data type 下方提示「可多選,只顯示已連線的來源。」＋「管理連線」連結，點擊開啟 Connectors modal
- [ ] 送出鈕 disabled 條件：`partIds.length && timeRange && dataTypes.length`；disabled 時顯示「請先選 part id、time range、data type」
- [ ] 送出後收合成「已設定 N 項 分析條件」摘要（自 issue 06 移入：摘要必須存在於對話歷史，因為送出答案會開始新的一輪串流並重置 reducer）
- [ ] Seam test：點 SPC 按鈕→斷言表單出現且 Data type 只列出已連線的 Connector；斷開一個 Connector 後重開→斷言選項少一項；填齊三項→斷言送出鈕啟用、送出後收合成摘要且分析開始跑
