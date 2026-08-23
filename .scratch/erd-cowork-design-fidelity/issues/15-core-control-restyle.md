# 15: 核心控制項樣式重製

**What to build:** The buttons and chips a user touches constantly (New chat, filters, Connector toggles) stop reading as unstyled antd defaults.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] New chat button matches the mockup's measurements (h38, br9, fs13, fw500, gap7, no shadow)
- [ ] Context/filter/sort chips match the mockup (h28, pad 5px 10px, br14, fs12, secondary text color, gap5, white background + border)
- [ ] Connector toggle buttons render visually distinct styling per connection state: connected (solid primary circle with white check), connecting (primary-bg + primary-border + spinner), expired (warning-colored border), other (1.5px gray border) — the existing `data-connected` attribute currently has no matching CSS
- [ ] Verification: render each Connector state and assert the expected styling is applied (computed style or class assertion); chip/button styling checked the same way, consistent with how the project already verifies styling elsewhere
