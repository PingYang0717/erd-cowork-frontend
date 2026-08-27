import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend target for the dev/preview proxy——本機開發唯一路線,不吃任何環境變數
// (容器/部署走反向代理,不經 vite,此設定與其無關)。
const backendUrl = 'http://localhost:8080';

const serverOptions = {
  proxy: {
    '/api': { target: backendUrl, changeOrigin: true },
  },
} as const;

export default defineConfig({
  // React Compiler targets React 19; on 18 it needs the react-compiler-runtime
  // polyfill, which is not worth carrying for what it buys here.
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  server: serverOptions,
  preview: serverOptions,
  test: {
    environment: 'jsdom',
    // Serial by file. Every pane suspends before it renders, so a findBy* waits on one
    // more async hop than it used to; running 24 files at once starves those waits and
    // fails tests that pass on their own. A suite that is the acceptance gate has to be
    // trustworthy before it is fast — `--file-parallelism` re-enables it when needed.
    fileParallelism: false,
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
});
