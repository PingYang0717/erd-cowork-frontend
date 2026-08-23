# 03: Theme (light/dark) shell

**What to build:** A working light/dark mode toggle for the whole app shell, with the choice remembered across visits.

**Blocked by:** 02 (MSW + testing harness)

**Status:** done

- [x] `useThemeStore` (Zustand, `features/theme/store`) with `isDarkMode`/`toggleTheme`, persisted to `localStorage` under `theme-storage`
- [x] A visible theme toggle control switches Ant Design's theme algorithm (light/dark) across the whole app instantly
- [x] Reloading the page after toggling keeps the previously chosen theme
- [x] Seam test: render app shell, toggle theme via user-event, assert the dark/light state is reflected and survives a simulated reload

## Comments

**2026-08-23:** Dark mode was audited against the mockup and did not match. Two
faults: the app only ever defined 13 of the `--erd-color-*` custom properties its
CSS and inline styles actually use, so `--erd-color-primary-bg`, `-primary-border`,
`-warning`, `-error`, `-text-quaternary` and the shadows silently kept their
light-mode literal fallbacks in dark mode; and the surfaces came from antd's dark
algorithm (`#000000` / `#141414` / `#1f1f1f`) rather than the mockup's
(`#17181c` / `#1f1f22` / `#262629`).

Fixed by adding `features/theme/tokens.ts` — the mockup's two palettes copied
verbatim — and feeding it to both the antd `ConfigProvider` tokens and the CSS
custom properties. One trap worth recording (now in `architecture.md` §8): seed
tokens must stay on the _light_ values in both themes, because the mockup's dark
palette is what antd derives from those seeds; passing the dark value in made the
primary button `#165bbe` instead of `#1668dc`. Verified in the browser: surface
`#17181c`, rail `#1f1f22`, borders `#303030`, primary button `#1668dc`, gallery
cards `#1f1f22` on the dark `--shadow-sm`.

- [x] The `--erd-color-*` surface covers every variable the app reads, in both themes
- [x] Both themes match `eRDWorkspace20260819.html` token-for-token (ADR-0004)

**2026-08-23 (follow-up):** The dialogs and the collapsed rail's chat-history
flyout were still light in dark mode after the palette fix. Root cause: the
`--erd-color-*` variables were set as inline styles on the themed wrapper
`<div>`, but every one of those surfaces is portaled to `document.body` — antd's
Modal and Dropdown, and the flyout's own `createPortal` — so they sat outside the
subtree that inherited them and every `var(--erd-color-…, <light literal>)` in
their CSS Modules resolved to the light fallback. antd's own `--ant-*` variables
were unaffected, which is why the surrounding chrome looked right and only our
styles were wrong.

Fixed by declaring the palette on `:root` (a `<style>` element rendered from the
same token table) instead of on a wrapper. Also aligned while there: the dialog
panel now carries the mockup's hairline border and `--shadow-lg`
(`0 12px 40px rgba(0,0,0,.28)`, which the mockup uses as a var fallback and never
declares) over a `rgba(0,0,0,.42)` + `blur(1px)` mask; the footer band uses
bg-container; connector rows got the mockup's bg-container background; and the
attach dialog's error box now uses the error-bg / error-border tokens instead of a
hardcoded light red tint.

Verified in the browser in dark mode: dialog panel `#262629` with a `#303030`
border, connectors rows `#1f1f22`, search field `#1f1f22` / `#424242`, active
filter chip `#1668dc`, flyout `#262629` with the same border and shadow.

- [x] Portaled surfaces (dialogs, dropdown menus, flyout) read the theme in both modes
