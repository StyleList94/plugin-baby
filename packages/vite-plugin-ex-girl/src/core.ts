import type { InlineConfig, PluginOption, ResolvedConfig } from 'vite';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { build } from 'vite';


/**
 * Shallow MV3 manifest shape.
 *
 * Only the fields this plugin touches are typed; everything else is
 * carried through untouched.
 *
 * @public
 */
export interface ManifestV3 {
  manifest_version: number;
  name: string;
  version: string;
  action?: { default_popup?: string; [key: string]: unknown };
  background?: {
    service_worker?: string;
    type?: string;
    [key: string]: unknown;
  };
  content_scripts?: {
    matches?: string[];
    js?: string[];
    css?: string[];
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

/**
 * Options for the ex-girl plugin.
 *
 * @public
 */
export interface ExGirlOptions {
  /**
   * Manifest source — a path relative to the project root, or an object.
   */
  manifest: string | ManifestV3;

  /**
   * Content script entries. Each entry becomes an IIFE bundle at
   * `scripts/<name>.js` and is mapped into `content_scripts[].js` in order.
   *
   * @defaultValue `undefined`
   */
  content?: string | string[];

  /**
   * Service worker entry, emitted as an ESM single file `background.js`.
   *
   * @defaultValue `undefined`
   */
  background?: string;

  /**
   * Extra IIFE scripts that are built like content scripts but NOT mapped
   * into the manifest — for runtime registration via `chrome.scripting`.
   *
   * @defaultValue `undefined`
   */
  scripts?: string | string[];

  /**
   * Sync the consumer package.json `version` into the manifest.
   *
   * @defaultValue `true`
   */
  syncVersion?: boolean;
}

/**
 * Output paths resolved by the build, fed into {@link transformManifest}.
 *
 * @internal
 */
export interface ManifestMapping {
  /** `scripts/<name>.js` outputs, in `content` option order. */
  contentOutputs: string[];
  /** `background.js` output, when a background entry was built. */
  background?: string;
  /** Popup HTML output emitted by the main build pass. */
  popup: string;
  /** Consumer package.json version; `undefined` skips the sync. */
  version?: string;
}

/** @internal */
export function toEntryList(input?: string | string[]): string[] {
  if (input === undefined) return [];
  return Array.isArray(input) ? input : [input];
}

/** @internal */
export function stemOf(entryPath: string): string {
  return path.parse(entryPath).name;
}

/**
 * Fails the build when content/scripts entries collide on the same
 * output name (`scripts/<stem>.js`) — outputs would overwrite each other.
 *
 * @internal
 */
export function assertNoStemCollision(
  contentEntries: string[],
  scriptEntries: string[],
): void {
  const seen = new Map<string, string>();

  for (const entry of [...contentEntries, ...scriptEntries]) {
    const stem = stemOf(entry);
    const previous = seen.get(stem);

    if (previous !== undefined) {
      throw new Error(
        `[vite-plugin-ex-girl] output name collision: "${previous}" and "${entry}" both emit scripts/${stem}.js`,
      );
    }

    seen.set(stem, entry);
  }
}

/**
 * Maps built output paths into a fresh copy of the manifest.
 * The input manifest is never mutated; `css` and unknown fields pass through.
 *
 * @internal
 */
export function transformManifest(
  manifest: ManifestV3,
  mapping: ManifestMapping,
  warn: (message: string) => void,
): ManifestV3 {
  const result = structuredClone(manifest);

  if (result.content_scripts?.length) {
    if (mapping.contentOutputs.length === 0) {
      warn(
        'manifest declares content_scripts but no `content` option was given — paths are passed through as-is',
      );
    } else {
      if (mapping.contentOutputs.length !== result.content_scripts.length) {
        warn(
          `content entries (${mapping.contentOutputs.length}) and manifest content_scripts (${result.content_scripts.length}) differ in count — mapping by index`,
        );
      }

      result.content_scripts = result.content_scripts.map(
        (declaration, index) =>
          index < mapping.contentOutputs.length
            ? { ...declaration, js: [mapping.contentOutputs[index]] }
            : declaration,
      );
    }
  }

  if (mapping.background !== undefined) {
    result.background = { ...result.background };
    result.background.service_worker = mapping.background;

    if (result.background.type !== 'module') {
      warn(
        'background.type must be "module" for the ESM service worker output — setting it automatically',
      );
      result.background.type = 'module';
    }
  }

  if (result.action?.default_popup !== undefined) {
    result.action.default_popup = mapping.popup;
  }

  if (mapping.version !== undefined) {
    result.version = mapping.version;
  }

  return result;
}

/**
 * Loads the manifest from a path (relative to `root`) or clones the
 * given object so later transforms stay isolated from the source.
 *
 * @internal
 */
export function loadManifest(
  source: string | ManifestV3,
  root: string,
): ManifestV3 {
  if (typeof source !== 'string') {
    return structuredClone(source);
  }

  const filePath = path.isAbsolute(source) ? source : path.join(root, source);

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`[vite-plugin-ex-girl] manifest not found: ${filePath}`);
  }

  try {
    return JSON.parse(raw) as ManifestV3;
  } catch {
    throw new Error(`[vite-plugin-ex-girl] invalid manifest JSON: ${filePath}`);
  }
}

/**
 * Reads `version` from the consumer's package.json next to the Vite root.
 *
 * @internal
 */
export function readConsumerVersion(root: string): string | undefined {
  try {
    const raw = readFileSync(path.join(root, 'package.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { version?: unknown };

    return typeof parsed.version === 'string' ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Marker used to identify this plugin's own instances inside inherited
 * plugin lists (recursion guard for sub-builds).
 *
 * @internal
 */
export const EX_MARKER = 'vite-plugin-ex-girl:marker';

/**
 * Snapshot of the main build's resolved config that sub-builds inherit.
 *
 * @internal
 */
export interface SubBuildContext {
  root: string;
  mode: string;
  /** Resolved outDir of the main pass (absolute). */
  outDir: string;
  resolve: ResolvedConfig['resolve'];
  define: ResolvedConfig['define'];
  envPrefix: ResolvedConfig['envPrefix'];
  /** Raw user plugins minus this plugin's own instances. */
  inheritedPlugins: PluginOption[];
}

/**
 * Builds the InlineConfig for one content/scripts/background sub-build pass.
 * `configFile: false` is the primary recursion guard — without it `build()`
 * would reload the consumer's vite config and re-instantiate this plugin.
 *
 * @internal
 */
export function createSubBuildConfig(
  entry: string,
  kind: 'content' | 'background',
  ctx: SubBuildContext,
): InlineConfig {
  const output =
    kind === 'content'
      ? {
          format: 'iife' as const,
          entryFileNames: `scripts/${stemOf(entry)}.js`,
          assetFileNames: 'scripts/[name][extname]',
        }
      : {
          format: 'es' as const,
          entryFileNames: 'background.js',
        };

  return {
    configFile: false,
    root: ctx.root,
    mode: ctx.mode,
    logLevel: 'warn',
    envPrefix: ctx.envPrefix,
    resolve: ctx.resolve,
    define: ctx.define,
    plugins: ctx.inheritedPlugins,
    publicDir: false,
    build: {
      outDir: ctx.outDir,
      emptyOutDir: false,
      copyPublicDir: false,
      rollupOptions: {
        input: path.resolve(ctx.root, entry),
        output,
        // 단일 파일 강제 — 동적 import까지 전부 인라인 (Rolldown 정식 옵션)
        codeSplitting: false,
      },
    },
  };
}

/**
 * Runs all sub-builds and writes the transformed manifest.
 * Called from `closeBundle` after the main (popup) pass has been written.
 *
 * @internal
 */
export async function runExtensionBuild(
  options: ExGirlOptions,
  ctx: SubBuildContext,
  popupOutput: string,
  warn: (message: string) => void,
): Promise<void> {
  const contentEntries = toEntryList(options.content);
  const scriptEntries = toEntryList(options.scripts);
  const backgroundEntries = options.background ? [options.background] : [];

  for (const entry of [
    ...contentEntries,
    ...scriptEntries,
    ...backgroundEntries,
  ]) {
    if (!existsSync(path.resolve(ctx.root, entry))) {
      throw new Error(`[vite-plugin-ex-girl] entry file not found: ${entry}`);
    }
  }

  for (const entry of [...contentEntries, ...scriptEntries]) {
    // eslint-disable-next-line no-await-in-loop -- 서브빌드는 같은 outDir에 쓰므로 순차 실행이 의도
    await build(createSubBuildConfig(entry, 'content', ctx));
  }

  if (options.background) {
    await build(createSubBuildConfig(options.background, 'background', ctx));
  }

  const manifest = loadManifest(options.manifest, ctx.root);
  const transformed = transformManifest(
    manifest,
    {
      contentOutputs: contentEntries.map(
        (entry) => `scripts/${stemOf(entry)}.js`,
      ),
      background: options.background ? 'background.js' : undefined,
      popup: popupOutput,
      version:
        options.syncVersion === false
          ? undefined
          : readConsumerVersion(ctx.root),
    },
    warn,
  );

  mkdirSync(ctx.outDir, { recursive: true });
  writeFileSync(
    path.join(ctx.outDir, 'manifest.json'),
    `${JSON.stringify(transformed, null, 2)}\n`,
  );
}
