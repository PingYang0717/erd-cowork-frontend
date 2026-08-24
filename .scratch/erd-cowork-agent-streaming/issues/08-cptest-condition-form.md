# 08: CP Test 條件表單

**What to build:** CP Test collects a different set of conditions, with fields that depend on each other.

**Blocked by:** 06

**Status:** ready-for-agent

> 設計稿定義：`eRDWorkspace20260819.html:83052-83180`；選項陣列 `:9561-9571`

- [x] 你的角色：單選 `INT Baseline`（hint「看整段 flow」）／`INT Loop`（hint「看自己的 loop」）／`其他`（hint「自行輸入」）
- [x] Flow：僅角色＝`INT Baseline` 時顯示，單選「整段 flow (全流程)」/ FEOL / MEOL / BEOL
- [x] Loop：僅角色＝`INT Loop` 時顯示，單選 FIN / Gate (GT) / POV / Contact (CT) / M1 / Via1 (V1)
- [x] 自行輸入範圍：僅角色＝`其他` 時顯示，placeholder「例如:M1+Via1、EOL 全段…」
- [x] 時間區間：單選「近 7 天」/「近 30 天」/「本季 (Q3)」
- [x] 檢視：「只看我送測的 (王小明)」開關 chip，選中時 primary 實心＋勾號 icon，未選時 user icon
- [x] 切換角色時清空 Flow / Loop / 自行輸入的既有答案
- [x] 送出鈕文案「開始分析」
- [x] Seam test：選 INT Baseline→斷言 Flow 出現、Loop 不在；改選 INT Loop→斷言 Flow 消失、先前的 Flow 答案已清空、Loop 出現；切「只看我送測的」→斷言送出的 `answers` 帶布林值

## Comments

**2026-08-25:** 完成。欄位定義在 `src/mocks/questionFixtures.ts`（issue 07 一併建立），
本票補上 `boolean` 欄位的正確語意：答案是 `true` / `false` 而不是選項的 value 字串，
再點一次會關掉（chip 群組的單選語意做不到這件事），摘要顯示該選項的 label 而不是
`"true"`。
