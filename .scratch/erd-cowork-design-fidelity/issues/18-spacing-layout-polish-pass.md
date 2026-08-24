# 18: 間距/圓角/版面細節整批對齊

**What to build:** A batch of pure CSS-token adjustments across already-existing components and global styles, closing out the remaining small measurement gaps against the mockup. No new components or logic.

**Blocked by:** None (can start immediately)

**Status:** done

> **Note (verification):** per the spec's testing decision, the pure CSS
> token values here are verified by side-by-side visual comparison against
> `eRDWorkspace20260819.html` (ADR-0004); the default panel widths
> (270/430) are asserted in the existing layout seam tests, which were
> updated accordingly.

- [ ] Session row padding/margin/border-radius match the mockup; title/time font sizes corrected; selected-row bold weight no longer bleeds into the time text
- [ ] Thread/Artifact toolbar height and padding match the mockup (h54, pad 0 20); thread title font-size corrected
- [ ] Thread scroll region padding and Composer padding match the mockup's asymmetric values
- [ ] Message group headers (PINNED/RECENTS) and count badges match the mockup's spacing/radius
- [ ] Rename input matches the mockup's custom styling (border-radius, border color, padding, font-size) instead of the antd default
- [ ] Session ⋮ menu and attachment kebab menus match the mockup's width/radius/item padding/dividers — the Pin icon's filled-when-pinned behaviour is deliberately kept and NOT reverted to the mockup's fixed outline icon
- [ ] Left-rail nav section divider added below the Schedule/Artifacts group
- [ ] Session rail and thread panel default widths changed to 270px/430px (existing drag min/max range unchanged)
- [ ] Sort menu's selected option shows a primary-bg background highlight in addition to the existing checkmark
- [ ] Global scrollbar styling and `-webkit-font-smoothing: antialiased` added
- [ ] Share dialog Modal width changed to 460px
- [ ] Verification: side-by-side visual comparison against `eRDWorkspace20260819.html` per ADR-0004's acceptance approach; no new automated assertions required for pure styling changes
