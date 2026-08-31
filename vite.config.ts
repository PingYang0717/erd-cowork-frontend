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
    // Four workers, measured 2026-08-28: serial took ~110s, 4 workers 30s — five green
    // runs across 2/4 workers, zero flakes. The starvation that once forced
    // `fileParallelism: false` (every pane suspends before rendering; unbounded
    // parallelism starves the findBy* waits) only happens with a worker per core —
    // a bounded pool keeps the waits fed. If the suite ever flakes under load, lower
    // this before disabling parallelism outright.
    maxWorkers: 4,
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
});
