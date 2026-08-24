# 00: 文件與契約落地

**What to build:** The decisions from the design session exist as documents before any code depends on them.

**Blocked by:** None

**Status:** ready-for-agent

- [x] `CONTEXT.md`：`Scenario` 詞條改寫為「決定要反問哪些分析條件、跑哪段流程、產哪種 Artifact」；新增「分析條件」「反問」「Agent event」「Thinking」「修復」五條；`Connector` 與 `DC Item` 補上與反問卡的關係
- [x] `docs/adr/0005-sse-streaming-replaces-batch-reply.md`
- [x] `docs/adr/0006-scenario-drives-clarification.md`
- [x] `docs/api/interface.md`：Message / Chat 段落改寫為 SSE 契約（事件表、請求 body、錯誤語意、心跳）；新增 live 模式端點覆蓋表
- [ ] `.scratch/erd-cowork-frontend/issues/18-dc-item-picker.md` 標記為 superseded，指向本 feature 的 issue 09
