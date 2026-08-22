# 01: Project scaffold & tooling

**What to build:** A working, lintable, formattable React app skeleton that boots to a blank page, matching `architecture.md`'s stack and folder conventions, so every later feature ticket has a stable base to build on.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] Vite + React 19 + TypeScript project builds and runs (`npm run dev` shows a blank page with no console errors)
- [ ] Ant Design, React Router, Zustand, TanStack Query, Axios installed and wired into `app/providers.tsx`
- [ ] Folder structure matches `architecture.md`: `app/`, `layouts/`, `pages/`, `features/`, `components/`, `hooks/`, `stores/`, `services/`, `types/`, `utils/`
- [ ] ESLint 9 flat config + Prettier configured per `architecture.md` 第7節, `npm run lint` passes on the skeleton
- [ ] Husky + lint-staged pre-commit hook runs `eslint --fix` + `prettier --write` on staged files
- [ ] TypeScript strict mode left off; `@typescript-eslint/no-explicit-any` enforced as error
