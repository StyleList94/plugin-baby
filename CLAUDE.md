# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Plugin monorepo managed with pnpm workspaces, Turborepo, and changesets. Contains Vite/Rollup plugin packages published to npm.

## Commands

```bash
pnpm build              # Build all packages (via Turbo)
pnpm lint               # Lint all packages (via Turbo)
pnpm format             # Format with Prettier (ts, md)
pnpm check-types        # Type check all packages

# Single package (from root)
pnpm --filter <package-name> build
pnpm --filter <package-name> lint

# Per-package (run from package directory)
pnpm build              # tsdown
pnpm dev                # tsdown --watch
pnpm lint               # eslint src

# Release
pnpm changeset          # Create changeset
pnpm version            # Apply changesets to versions
pnpm release            # Build + publish to npm
```

## Architecture

```text
packages/
  _eslint-config/              # Shared ESLint flat config (@plugin-baby/eslint-config)
  _typescript-config/          # Shared tsconfig for tsdown (@plugin-baby/typescript-config)
  rollup-plugin-im-client-component/   # Auto 'use client' directive injection
  vite-plugin-crush-envy/              # Type-safe .env for Vite
  vite-plugin-react-stylish-svg/       # SVG as React component
  vite-plugin-sexy-declare-type/       # Auto .d.ts generation
```

Internal config packages are prefixed with `_` for visual grouping. All plugin packages follow the same structure:

- `src/` → source code (TypeScript)
- `dist/` → build output (tsdown)
- `eslint.config.js` → extends `@plugin-baby/eslint-config/base`
- `tsconfig.json` → extends `@plugin-baby/typescript-config/tsdown.json`

## Build System

- **tsdown** (powered by Rolldown) builds all plugin packages
- Turbo orchestrates builds with `^build` dependency graph
- Each package declares `external` in `tsdown.config.ts` for peer dependencies (e.g., `rollup`, `vite`)

## Shared Configs

- **ESLint**: Flat config using `eslint-config-stylish` + `eslint-config-stylish/typescript`, with turbo plugin and prettier integration
- **TypeScript**: `strict: true`, `verbatimModuleSyntax: true`, `module: preserve`, `moduleResolution: bundler`, target esnext
- **Prettier**: Single quotes, trailing commas, 80 print width

## Release Process

Changesets manages independent versioning per package. Each package has its own version and changelog. `access: public` in changeset config. Release workflow runs on push to `main` via GitHub Actions.

## Conventions

- Package names use creative/stylish naming (e.g., crush-envy, sexy-declare-type, im-client-component)
- All packages are pure ESM (`"type": "module"`)
- `workspace:*` for internal dependency references
- Commit messages follow conventional commits (`feat:`, `chore:`, `ci:`, `fix:`)

## Gotchas

- tsdown bundles all deps not listed in `external` of `tsdown.config.ts` — peer deps like `rollup` or `vite` must be explicitly external
- Vite may convert single quotes to double quotes in build output — idempotency checks in plugins should handle both quote styles
- Changesets support multiple packages with different bump types in a single changeset file (e.g., one package major, others patch)
- Internal config packages (`_eslint-config`, `_typescript-config`) use `_` prefix for directory sorting only — package names remain `@plugin-baby/*`
