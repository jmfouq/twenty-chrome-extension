import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Content scripts cannot be ES modules, so each one is bundled separately as a single IIFE.
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, `src/content/${mode}.ts`),
      formats: ['iife'],
      name: `Twenty_${mode}`,
      fileName: () => `${mode}-content.js`,
    },
  },
}));
