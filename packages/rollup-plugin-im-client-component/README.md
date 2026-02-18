# rollup-plugin-im-client-component

Automatically detect client-side React APIs and inject `'use client'` directive into build output

[![npm](https://img.shields.io/npm/v/rollup-plugin-im-client-component)](https://www.npmjs.com/package/rollup-plugin-im-client-component)

## Features

- ✨ Auto-inject `'use client'` based on React client API detection
- 🎯 Specifier-level matching (only hooks and client APIs, not `jsx-runtime`)
- 📦 Source map preservation
- 🔧 Compatible with Vite, Rollup, and Rolldown

## Getting Started

### Requires

- Node.js 20+

### Installation

```bash
pnpm add -D rollup-plugin-im-client-component
```

```bash
# or npm
npm install -D rollup-plugin-im-client-component
```

```bash
# or yarn
yarn add -D rollup-plugin-im-client-component
```

## Quick Start

### Vite Library Mode

`vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import clientDirective from 'rollup-plugin-im-client-component';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
      },
    },
  },
  plugins: [react(), clientDirective()],
});
```

### Rollup

`rollup.config.js`

```typescript
import clientDirective from 'rollup-plugin-im-client-component';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'es',
    preserveModules: true,
  },
  plugins: [clientDirective()],
};
```

## How It Works

1. Hooks into `renderChunk` (output phase, after bundling)
2. Parses import statements in each output chunk
3. Detects React client-side API imports (`useState`, `useEffect`, etc.)
4. Prepends `'use client'` directive to matched files

> **Note:** Use with `preserveModules: true` so each component gets its own chunk. Otherwise the directive may be applied to a single bundled file.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `clientPatterns` | `ClientPattern[]` | Built-in React patterns | Completely replace default detection patterns |
| `extraPatterns` | `ClientPattern[]` | `[]` | Additional patterns merged with defaults |
| `exclude` | `string[]` | `['**/*.css.js']` | Glob patterns to skip injection |
| `include` | `string[]` | `[]` | Glob patterns to always inject |
| `directive` | `string` | `'use client'` | Directive string to inject |

## Examples

### Add third-party library patterns

```typescript
clientDirective({
  extraPatterns: [
    { source: /^@radix-ui\/react-/ },
    { source: /^motion\// },
  ],
});
```

### Force include specific files

```typescript
clientDirective({
  include: ['**/components/**/*.js'],
});
```

## Default Detection

### `react`

Hooks: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `useContext`, `useReducer`, `useId`, `useLayoutEffect`, `useInsertionEffect`, `useImperativeHandle`, `useDebugValue`, `useSyncExternalStore`, `useTransition`, `useDeferredValue`, `useOptimistic`, `useActionState`

Client APIs: `use`, `createContext`, `forwardRef`, `memo`, `lazy`, `startTransition`

### `react-dom`

`createPortal`, `flushSync`

> `react/jsx-runtime` is intentionally excluded since all components import it.
