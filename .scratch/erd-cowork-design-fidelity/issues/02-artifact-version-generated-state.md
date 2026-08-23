# 02: Per-version 生成/發佈狀態 + 生成動作

**What to build:** Each Artifact version carries its own generated/published state (replacing the Artifact-level `shared` flag this app previously simplified down to), and the Artifact panel exposes an explicit "generate" step instead of always showing the result as already generated.

**Blocked by:** 01 (自訂 Tooltip 元件)

**Status:** done

> **Note:** This deliberately reverses the simplification recorded in ticket 09/13 of `.scratch/erd-cowork-frontend/` ("no separate un-generated state in this app's data model") — a decision the product owner made explicitly after reviewing the mockup diff, not an oversight. Reference this note if a future review questions the scope change.

- [ ] `ArtifactVersion` contract carries its own generated/published fields; `docs/api/interface.md` and `types/api/ArtifactVersion.ts` updated accordingly
- [ ] Artifact panel shows a primary-colored "生成 Artifact" button when the currently-viewed version has not been generated
- [ ] Clicking it marks that version as generated; the panel switches to a "✓ 已生成" chip using the `CheckOutlined` icon (not `CheckCircleFilled`) and ticket 01's tooltip
- [ ] Switching to a different, ungenerated version shows the "生成 Artifact" button again for that version, independent of any other version's state
- [ ] Seam test: seed an ungenerated version and assert the generate button renders; trigger generation via the mocked endpoint and assert the chip appears; seed a second, independent version and assert its state doesn't inherit the first version's generated status
