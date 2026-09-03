import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import oxlint from 'eslint-plugin-oxlint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
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
