# 13: Artifact 錯誤通道與修復流程

**What to build:** A broken artifact offers to fix itself.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] mock 產生的 artifact HTML `<head>` 注入錯誤收集腳本（移植自 `cowork-master` 的 `backend/src/main/resources/templates/artifact/head-inject.vm`）：攔截 `error` 與 `unhandledrejection`，批次 debounce 後 `parent.postMessage({ type: 'erd-artifact-error', errors }, '*')`
- [ ] `ArtifactFrame` 監聽該訊息，驗證 `event.source` 為自身 iframe，轉發錯誤（`{ message, line, col }`）
- [ ] 錯誤經跨欄 Zustand store 送達 `ThreadPanel`，對話串底部出現修復提議卡：「⚠ 偵測到儀表板執行錯誤（N 個）」、第一則錯誤訊息（超過 120 字截斷）、「修復」／「忽略」
- [ ] 修復中顯示 loading「修復中，請稍候…」；失敗顯示「修復未成功」＋「再試一次」／「忽略」
- [ ] 「忽略」後不再對同一個 Artifact 提議
- [ ] 切換 Session 或切換到不同 Artifact 時清除提議
- [ ] 新增一個故意壞掉的 artifact fixture；mock 的修復端點把它換成正常版本並 bump 一個 Artifact version（複用既有的 regenerate 機制）
- [ ] `docs/api/interface.md` 補上修復端點
- [ ] Seam test：開啟壞掉的 artifact，斷言提議卡出現；點修復，斷言 loading→成功→iframe 重載為可執行版本且版本數 +1；另一路徑斷言失敗態與忽略後不再提議
