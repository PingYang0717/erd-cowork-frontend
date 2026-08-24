# 16: 選取態與空狀態色彩 token

**What to build:** Selected and active states use the mockup's exact color tokens instead of computed approximations, in both themes.

**Blocked by:** None (can start immediately)

**Status:** done

> **Note (verification):** CSS Modules stylesheets are not applied in the
> jsdom test environment, so computed-style assertions cannot observe these
> values; verified by side-by-side visual comparison per ADR-0004, matching
> the spec's "純樣式 token 調整不寫斷言測試" decision.

- [ ] Selected session row background/border use the mockup's fixed `--erd-color-primary-bg`/`--erd-color-primary-border` tokens instead of `color-mix`-derived values, correct in both light and dark themes
- [ ] Thread empty-state icon tile uses the primary-bg (blue) background instead of the gray fill-tertiary background, at the mockup's size/radius/icon scale
- [ ] Left-rail nav rows (Schedule/Artifacts) use the mockup's inactive text/icon colors, and their active state switches background, text, icon, and badge all to primary
- [ ] Verification: assert computed styles for a selected session row and the thread empty state match the token values in both themes
