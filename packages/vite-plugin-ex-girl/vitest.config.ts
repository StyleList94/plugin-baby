import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // 통합 테스트가 실제 vite build()를 여러 번 돌려서 여유 있게
    testTimeout: 30_000,
  },
});
