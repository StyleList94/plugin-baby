import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  external: [
    'typescript',  // TypeScript를 번들에 포함시키지 않음
    'vite',        // Vite도 external
  ],
});
