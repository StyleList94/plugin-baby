# Vite Plugin Ex Girl

Build Chrome extensions with Vite.

> `ex` stands for **ex(tension)**. She knows everything about your manifest.

## Features

- 🧩 **Manifest mapping** — reads your `manifest.json` source and rewrites `content_scripts[].js`, `background.service_worker`, and `action.default_popup` to the built output paths
- 📦 **Content scripts as single-file IIFE** — no ESM, no code splitting, no hash; dynamic imports are inlined
- 🕶️ **Unmapped runtime scripts** — build files for `chrome.scripting.registerContentScripts()` / `executeScript()` without declaring them in the manifest
- ⚙️ **ESM service worker** — single-file `background.js` with `"type": "module"` enforced
- 🔄 **Version sync** — keeps `manifest.version` in lockstep with your `package.json`
- 👀 **Watch friendly** — entry files are registered with the main watcher; rebuilds re-run every pass

## Getting Started

### Requires

- Vite 8.0.0+
- Node.js 20+

### Install

```bash
pnpm add -D @stylelish/vite-plugin-ex-girl
```

## Quick Start

### Add plugin to Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import exGirl from '@stylelish/vite-plugin-ex-girl';

export default defineConfig({
  plugins: [
    exGirl({
      manifest: 'src/manifest.json',
      content: 'src/scripts/content.ts',
      background: 'src/service-worker/background.ts',
    }),
  ],
});
```

The popup is just a regular Vite HTML entry (`index.html` at the project root). Static assets referenced by the manifest (icons, injected CSS) live in `public/`.

### Example

`src/manifest.json` (source — entry paths point at your TypeScript files):

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "0.0.0",
  "action": { "default_popup": "index.html" },
  "background": { "service_worker": "src/service-worker/background.ts" },
  "content_scripts": [
    { "matches": ["https://*/*"], "js": ["src/scripts/content.ts"] }
  ]
}
```

`dist/manifest.json` (after `vite build` — mapped and version-synced):

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.4.2",
  "action": { "default_popup": "index.html" },
  "background": { "service_worker": "background.js", "type": "module" },
  "content_scripts": [
    { "matches": ["https://*/*"], "js": ["scripts/content.js"] }
  ]
}
```

Load `dist/` via `chrome://extensions` → _Load unpacked_. Done.

## Options

| Option        | Type                   | Default     | Description                                                                                                                      |
| ------------- | ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `manifest`    | `string \| ManifestV3` | (required)  | Manifest source — a path relative to the project root, or an object literal                                                      |
| `content`     | `string \| string[]`   | `undefined` | Content script entries. Each becomes an IIFE at `scripts/<name>.js`, mapped into `content_scripts[].js` in order                 |
| `background`  | `string`               | `undefined` | Service worker entry, emitted as single-file ESM `background.js`                                                                 |
| `scripts`     | `string \| string[]`   | `undefined` | Extra IIFE scripts built like content scripts but **not** mapped into the manifest — for `chrome.scripting` runtime registration |
| `syncVersion` | `boolean`              | `true`      | Sync `package.json` version into the manifest                                                                                    |

## Content Script CSS

The plugin never touches `content_scripts[].css` — it passes through as-is. Pick the pattern that fits:

> ⚠️ The content script _isolated world_ isolates **JavaScript only**. Injected CSS cascades together with the host page's styles — in both directions.

### A. Page-wide styles (declarative)

Put plain CSS in `public/` and declare it in the manifest. Vite copies it verbatim:

```json
"content_scripts": [
  {
    "matches": ["https://*/*"],
    "js": ["src/scripts/content.ts"],
    "css": ["styles/content.css"]
  }
]
```

`public/styles/content.css` → `dist/styles/content.css`. Injected before the page's DOM is constructed.

### B. Conditional injection (programmatic)

Same `public/` file, injected on demand from the service worker:

```ts
await chrome.scripting.insertCSS({
  target: { tabId },
  files: ['styles/content.css'],
});
```

### C. Extension UI widgets (style isolation)

For UI your content script renders into the page, isolate it with Shadow DOM. Vite's built-in `?inline` import bundles the compiled CSS into the IIFE as a string — no file, no manifest entry:

```ts
// content.ts
import css from './widget.css?inline';

const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'open' });

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);
shadow.adoptedStyleSheets = [sheet];

document.body.append(host);
```

Patterns A/B ship raw CSS (no Tailwind/PostCSS — `public/` skips the pipeline). Pattern C goes through the Vite CSS pipeline.

## Notes

- **Build only** — the plugin declares `apply: 'build'`. Use `vite build --watch` for development; the Vite dev server can't serve extension pages.
- **Extra HTML entries** (options page, side panel, devtools) are regular Vite inputs — add them to `build.rollupOptions.input` yourself and reference the output path in your manifest.
- **Watch limitation** — only entry files (and the manifest) are registered with the watcher. Edits to modules _imported by_ content/background entries don't trigger a rebuild of the main pass.
- **Output name collision** — `content` and `scripts` entries sharing a filename stem (`a/content.ts` + `b/content.ts`) would overwrite each other at `scripts/content.js`, so the build fails fast instead.

_익스텐션 야호~_
