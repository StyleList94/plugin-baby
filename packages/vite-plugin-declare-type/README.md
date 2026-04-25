# Vite Plugin Declare Type

> ⚠️ **Renamed from `vite-plugin-sexy-declare-type`.** The unscoped package is deprecated and will no longer receive updates. Update your imports:
>
> ```diff
> - import sexyDeclareType from 'vite-plugin-sexy-declare-type';
> + import declareType from '@stylelish/vite-plugin-declare-type';
> ```

Zero-config TypeScript declaration file generator for Vite library mode

[![npm](https://img.shields.io/npm/v/@stylelish/vite-plugin-declare-type)](https://www.npmjs.com/package/@stylelish/vite-plugin-declare-type)

## Features

- ✨ Zero configuration - works out of the box
- 🎯 Automatic entry detection from Vite library config
- ⚡ Fast declaration generation using TypeScript Compiler API

## Getting Started

### Requires

- Vite 7.0.0+
- TypeScript 5.0.0+

### Install

```bash
pnpm add -D @stylelish/vite-plugin-declare-type
```

## Quick Start

### Add plugin to Vite config

`vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import declareType from '@stylelish/vite-plugin-declare-type';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
    },
  },
  plugins: [declareType()],
});
```

That's it! When you run `vite build`, declaration files (`.d.ts`) will be automatically generated alongside your build output.

### Type Checking

This plugin focuses on **declaration file generation**, not type validation. For production builds, always run type checking first:

```json
{
  "scripts": {
    "build": "tsc --noEmit && vite build"
  }
}
```

This ensures:

- ✅ Type errors are caught before build
- ✅ Clean build output without warnings
- ✅ Production-ready type declarations

## Limitations

- **Library Mode Only**: Only works with Vite's library mode (`build.lib`)
- **No tsconfig Inheritance**: Uses hardcoded TypeScript options for maximum compatibility
  - May generate declarations even with type errors in your code
  - Run `tsc --noEmit` first for comprehensive type checking

## Troubleshooting

### Declarations not generated

Check if library mode is configured:

```typescript
export default defineConfig({
  build: {
    lib: {
      // ← Must have this
      entry: './src/index.ts',
    },
  },
});
```

### Types seem incorrect

The plugin uses simplified TypeScript config for broad compatibility. If you need precise type validation:

1. **Run type check before build**:

   ```bash
   pnpm tsc --noEmit
   ```

2. **Update to build script**:

   ```json
   {
     "scripts": {
       "build": "tsc --noEmit && vite build"
     }
   }
   ```
