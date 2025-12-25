# Vite Plugin Crush Envy

Make `.env` type-safe, finally

[![npm](https://img.shields.io/npm/v/vite-plugin-crush-envy)](https://www.npmjs.com/package/vite-plugin-crush-envy)

## Features

- ✨ Auto-generate `ImportMetaEnv` types from `.env` files
- 🎯 Safe injection into existing `vite-env.d.ts`
- ⚡ Auto-regenerate on `.env` file changes
- 📦 Optional `process.env` type support

## Getting Started

### Requires

- Vite 7.0.0+

### Install

```bash
pnpm add -D vite-plugin-crush-envy
```

## Quick Start

### Add plugin to Vite config

`vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import crushEnvy from 'vite-plugin-crush-envy';

export default defineConfig({
  plugins: [crushEnvy()],
});
```

### Example

`.env`

```bash
VITE_ENV=development
VITE_BASE_URL=/app
```

Generated in `src/vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_ENV: string;
}
```

Now `import.meta.env.VITE_*` has full autocompletion!

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `injectToViteEnv` | `boolean` | `true` | Inject into `src/vite-env.d.ts` |
| `output` | `string` | `src/env.d.ts` | Output path when `injectToViteEnv: false` |
| `includeProcessEnv` | `boolean` | `true` | Generate `NodeJS.ProcessEnv` types |
