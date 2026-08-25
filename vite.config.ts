import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // React Compiler targets React 19; on 18 it needs the react-compiler-runtime
  // polyfill, which is not worth carrying for what it buys here.
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
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
