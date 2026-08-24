# 13: Artifact 錯誤通道與修復流程

**What to build:** A broken artifact offers to fix itself.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] mock 產生的 artifact HTML `<head>` 注入錯誤收集腳本（移植自 `cowork-master` 的 `backend/src/main/resources/templates/artifact/head-inject.vm`）：攔截 `error` 與 `unhandledrejection`，批次 debounce 後 `parent.postMessage({ type: 'erd-artifact-error', errors }, '*')`
- [x] `ArtifactFrame` 監聽該訊息，驗證 `event.source` 為自身 iframe，轉發錯誤（`{ message, line, col }`）
- [x] 錯誤經跨欄 Zustand store 送達 `ThreadPanel`，對話串底部出現修復提議卡：「⚠ 偵測到儀表板執行錯誤（N 個）」、第一則錯誤訊息（超過 120 字截斷）、「修復」／「忽略」
- [x] 修復中顯示 loading「修復中，請稍候…」；失敗顯示「修復未成功」＋「再試一次」／「忽略」
- [x] 「忽略」後不再對同一個 Artifact 提議
- [x] 切換 Session 或切換到不同 Artifact 時清除提議
- [x] 新增一個故意壞掉的 artifact fixture；mock 的修復端點把它換成正常版本並 bump 一個 Artifact version（複用既有的 regenerate 機制）
- [x] `docs/api/interface.md` 補上修復端點
- [x] Seam test：開啟壞掉的 artifact，斷言提議卡出現；點修復，斷言 loading→成功→iframe 重載為可執行版本且版本數 +1；另一路徑斷言失敗態與忽略後不再提議

## Comments

**2026-08-25:** 完成，但有一條與原本的 AC 不同：

**沒有做「故意壞掉的 artifact fixture」。** 原因是 jsdom 不會執行 iframe `srcdoc` 裡的
腳本，所以注入的收集器在測試環境中永遠不會觸發——壞掉的 fixture 也就證明不了任何事。
測試改為直接模擬那則 `postMessage`（正是收集器會送出的訊息），走的仍是
`ArtifactFrame` 的真實邊界，包含 `event.source` 必須是自己那個 iframe 的驗證。
收集器本身則以「artifact HTML 確實帶著它」來斷言。

修復失敗的路徑（`repaired: false` →「修復未成功」→「再試一次」）由測試 stub 端點來驗，
因為 mock 端每次修復都會成功——`repaired: false` 是真實結果而不是錯誤，值得在
`docs/api/interface.md` 講清楚，否則後人會把它當成例外處理掉。
