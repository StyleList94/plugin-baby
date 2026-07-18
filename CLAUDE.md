# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

```text
packages/
  _eslint-config/              # @plugin-baby/eslint-config — Shared ESLint flat config (internal)
  _typescript-config/          # @plugin-baby/typescript-config — Shared tsconfig for tsdown (internal)
  rollup-plugin-im-client-component/   # @stylelish/rollup-plugin-im-client-component — Auto 'use client' directive injection
  vite-plugin-crush-envy/              # @stylelish/vite-plugin-crush-envy — Type-safe .env for Vite
  vite-plugin-declare-type/            # @stylelish/vite-plugin-declare-type — Auto .d.ts generation
  vite-plugin-ex-girl/                 # @stylelish/vite-plugin-ex-girl — Chrome extension (MV3) build for Vite 8 (ex = extension)
  vite-plugin-react-svg/               # @stylelish/vite-plugin-react-svg — SVG as React component
```

Public plugins publish under `@stylelish/*`; internal-only configs stay under `@plugin-baby/*` and don't publish. Directory names use the unscoped form; only `package.json` `name` carries the scope.

## Testing

- Run all: `pnpm test` at root (turbo `test` task, dependsOn `^build`) or `vitest run` per package
- Only `vite-plugin-ex-girl` has tests so far — pattern: unit tests for pure logic + integration tests that run real vite `build()` against a fixture project in `test/fixtures/`
- Fixtures are data, not code: excluded from eslint (config `ignores`), tsconfig (`exclude`), and publish (`files: ["dist"]`), but committed to git

## Gotchas

- tsdown bundles all deps not marked never-bundle — peer deps like `rollup` or `vite` must be listed in `deps.neverBundle` (tsdown 0.22+; `external` is deprecated)
- typescript 7 crashes tsdown's d.ts generation (`rolldown-plugin-dts`: `useCaseSensitiveFileNames` TypeError) — pin `typescript@^6` in package devDeps until fixed
- Rolldown (Vite 8): `inlineDynamicImports` output option is deprecated/ignored — use `rollupOptions.codeSplitting: false` for single-file outputs
- JSDoc blocks (`/** */`) survive tsdown bundling into `dist/*.mjs` and `.d.mts` — write JSDoc in English; `//` line comments are stripped, so Korean is fine there
- Vite may convert single quotes to double quotes in build output — idempotency checks in plugins should handle both quote styles
