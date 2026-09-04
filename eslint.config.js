import prettierConfig from 'eslint-config-prettier';
import oxlint from 'eslint-plugin-oxlint';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint, { parser as typescriptEslintParser } from 'typescript-eslint';

// oxlint and ESLint run side by side, in that order (`npm run lint`).
//
// oxlint is the fast pass: it re-implements most of the eslint / typescript / react
// correctness rules in Rust and finishes in milliseconds. ESLint stays for what oxlint
// has no equivalent of — above all `simple-import-sort`, which is the only thing that
// keeps AGENTS.md's import-ordering rule automated rather than a review chore.
//
// `oxlint.configs['flat/recommended']` goes LAST and switches off every ESLint rule
// oxlint already covers, so a finding is reported once, by whichever tool owns it.
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // recommended 的 16 條裡有 13 條是 error(rules-of-hooks、set-state-in-render、
      // refs……),這裡一律降為 warn。用鍵去映射而不是逐條列出:升級後多出來的規則會
      // 自動跟著降級,不會有人漏改一條而讓它以 error 溜進來。
      ...Object.fromEntries(
        Object.keys(reactHooks.configs.recommended.rules).map((rule) => [rule, 'warn']),
      ),
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  prettierConfig,
  ...oxlint.configs['flat/recommended'],
  {
    // setup.ts 的 seedTestIdentity 是 side-effect import 且必須是第一行;部分環境的
    // lint 會對它報排序,所以掛了 disable directive。這台若沒觸發,預設的
    // reportUnusedDisableDirectives 會讓 --fix(pre-commit hook)把「沒用到的」
    // directive 自動拔掉——在會觸發的機器上就又紅了。對這一個檔關閉回報,directive
    // 才能在兩種環境都活著。
    files: ['src/test/setup.ts'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
);
