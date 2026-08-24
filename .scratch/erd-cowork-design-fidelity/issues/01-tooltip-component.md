# 01: 自訂 Tooltip 元件

**What to build:** A reusable tooltip component matching the mockup's `.erd-tip` styling, applied to an existing control so its real-world behaviour is proven, not just its default props.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] New tooltip component renders a dark background (inverted text color), `fs11.5`, `br7`, `shadow-md`, with a 0.35s delayed fade-in on hover/focus
- [ ] The component is exported in a generically reusable way so later tickets (03 分享鈕 gating, 04 版本選單, 08 全頁工具列) can apply it to their own controls without rebuilding it
- [ ] The Artifact panel's existing "重新生成" (Regenerate) button uses the new component instead of its native `title` attribute, as the first real usage
- [ ] Seam test: hover/focus the Regenerate button, assert the custom tooltip's content becomes visible (accounting for the fade delay) instead of relying on the native browser tooltip
