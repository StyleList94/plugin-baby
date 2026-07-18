import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  deps: {
    // vite는 peer dependency — 번들에 포함 금지
    neverBundle: ['vite'],
  },
});
