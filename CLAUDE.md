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
  vite-plugin-react-svg/               # @stylelish/vite-plugin-react-svg — SVG as React component
```

Public plugins publish under `@stylelish/*`; internal-only configs stay under `@plugin-baby/*` and don't publish. Directory names use the unscoped form; only `package.json` `name` carries the scope.

## Gotchas

- tsdown bundles all deps not listed in `external` of `tsdown.config.ts` — peer deps like `rollup` or `vite` must be explicitly external
- Vite may convert single quotes to double quotes in build output — idempotency checks in plugins should handle both quote styles
