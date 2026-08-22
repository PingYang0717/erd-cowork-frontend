# 03: Theme (light/dark) shell

**What to build:** A working light/dark mode toggle for the whole app shell, with the choice remembered across visits.

**Blocked by:** 02 (MSW + testing harness)

**Status:** done

- [x] `useThemeStore` (Zustand, `features/theme/store`) with `isDarkMode`/`toggleTheme`, persisted to `localStorage` under `theme-storage`
- [x] A visible theme toggle control switches Ant Design's theme algorithm (light/dark) across the whole app instantly
- [x] Reloading the page after toggling keeps the previously chosen theme
- [x] Seam test: render app shell, toggle theme via user-event, assert the dark/light state is reflected and survives a simulated reload
