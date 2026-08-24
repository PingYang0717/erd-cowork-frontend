# 14: live 模式接線與端點覆蓋表

**What to build:** The same UI can talk to a real backend instead of MSW.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] build-time 環境變數決定傳輸模式；mock 模式才註冊 MSW（不讓 MSW 進 production bundle）
- [ ] live 模式下 `agentApi` 打真實後端；DTO 差異（`sender` vs `role`、`stepsJson` / `questionsJson` 字串 vs 真陣列）在 `agentApi` 層做 adapter，UI 與型別不受影響
- [ ] `docs/api/interface.md` 的 live 模式端點覆蓋表：session / message / artifact HTML / file / config 走真後端；Artifacts 總覽清單與釘選、分享、Directory、Schedule、Connectors、Artifact 版本清單仍由 MSW 服務
- [ ] README 補上兩種模式的啟動方式
- [ ] Seam test：以環境變數切換，斷言 mock 模式註冊了 MSW、live 模式沒有；adapter 的雙向轉換有單元測試
