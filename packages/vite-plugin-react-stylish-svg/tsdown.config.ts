import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  copy: [
    { from: 'src/types.d.ts', to: 'dist/types.d.ts' }
  ],
});
