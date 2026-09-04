import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import typescriptEslintParser from '@typescript-eslint/parser';

// oxlint and ESLint run side by side, in that order (`npm run lint`).
//
// oxlint is the fast pass: it re-implements most of the eslint / typescript / react
// correctness rules in Rust and finishes in milliseconds. ESLint stays for what oxlint
// has no equivalent of — above all `simple-import-sort`, which is the only thing that
// keeps AGENTS.md's import-ordering rule automated rather than a review chore.
//
// `oxlint.configs['flat/recommended']` goes LAST and switches off every ESLint rule
// oxlint already covers, so a finding is reported once, by whichever tool owns it.
export default [
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
      ...Object.fromEntries(Object.keys(reactHooks.configs.recommended.rules).map((rule) => [rule, 'warn'])),
      // oxlint 也在跑這一條,而且是 error(.oxlintrc.json)。兩邊都開會讓同一個問題出現
      // 兩則訊息,所以這裡讓給它——擋不擋得住由 oxlint 那條決定,這裡只是重複。
      'react-hooks/rules-of-hooks': 'off',
      // 順序照 AGENTS.md:專案只有 `@/` 一個 alias,同資料夾的檔案走相對路徑。
      // 這五組寫出來的正是先前靠預設值得到的排列——`@/` 之所以落在套件之後,是因為
      // `@` 後面接的是 `/` 而不是字元,不符 `^@?\w`,於是掉進預設的 catch-all。
      // 寫明之後就不再靠那個巧合。
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react$', '^[a-z]', '^@[^/]'],
            [
              '^@/',
              '^\\.\\.(?!/?$)',
              // 指定的 '^\\.\\,/?$' 在 u flag 下是 invalid escape(\\, 不是合法跳脫),
              // 改用 README 對應的父目錄寫法。
              '^\\.\\./?$',
              '^\\./(?=.*/)(?!/?$)',
              // 指定的 '^\\/(?!/?$' 少一個右括號,無法編譯;同樣改用 README 的寫法。
              '^\\.(?!/?$)',
              '^\\./?$',
            ],
            ['^.+\\.s?css$'],
            ['^\\u0000'],
          ],
        },
      ],
    },
  },
];
