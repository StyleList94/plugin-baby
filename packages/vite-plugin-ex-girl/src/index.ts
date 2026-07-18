import type { ExGirlOptions, ManifestV3, SubBuildContext } from './core';

import type { Plugin, PluginOption, ResolvedConfig } from 'vite';

import path from 'node:path';

import {
  assertNoStemCollision,
  EX_MARKER,
  runExtensionBuild,
  toEntryList,
} from './core';


export type { ExGirlOptions, ManifestV3 };

/** @internal */
async function flattenPlugins(
  input: PluginOption | undefined,
): Promise<PluginOption[]> {
  const value = await input;

  if (!value) return [];

  if (Array.isArray(value)) {
    const nested = await Promise.all(
      value.map((item) => flattenPlugins(item)),
    );
    return nested.flat();
  }

  return [value];
}

/** @internal */
function isSelf(plugin: PluginOption): boolean {
  if (!plugin || typeof plugin !== 'object' || Array.isArray(plugin)) {
    return false;
  }

  const candidate = plugin as Plugin;
  const api = candidate.api as Record<string, unknown> | undefined;

  return api?.[EX_MARKER] === true || candidate.name === 'vite-plugin-ex-girl';
}

/**
 * Vite plugin that completes a Chrome extension (MV3) build.
 *
 * @remarks
 * The main Vite build handles the popup as a regular HTML entry. This
 * plugin then runs extra passes in `closeBundle`: content scripts and
 * runtime-injected scripts as single-file IIFEs, the service worker as a
 * single ESM file, and finally emits `manifest.json` with every entry
 * path mapped to the built outputs. `ex` stands for ex(tension).
 *
 * @param options - Manifest source and extension entry points.
 * @returns A Vite plugin instance.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite';
 * import exGirl from '@stylelish/vite-plugin-ex-girl';
 *
 * export default defineConfig({
 *   plugins: [
 *     exGirl({
 *       manifest: 'src/manifest.json',
 *       content: 'src/scripts/content.ts',
 *       background: 'src/service-worker/background.ts',
 *     }),
 *   ],
 * });
 * ```
 *
 * @example
 * ```ts
 * // Files registered at runtime via chrome.scripting.registerContentScripts()
 * // are built with the `scripts` option, without being mapped into the manifest.
 * exGirl({
 *   manifest: 'src/manifest.json',
 *   scripts: 'src/scripts/override.ts',
 * });
 * ```
 *
 * @public
 */
export default function exGirl(options: ExGirlOptions): Plugin {
  let resolved: ResolvedConfig;
  let inheritedPlugins: PluginOption[] = [];
  let popupOutput = 'index.html';
  let queue: Promise<void> = Promise.resolve();

  return {
    name: 'vite-plugin-ex-girl',
    apply: 'build',
    api: { [EX_MARKER]: true },

    async config(userConfig) {
      const flat = await flattenPlugins(userConfig.plugins);

      inheritedPlugins = flat.filter((plugin) => !isSelf(plugin));
    },

    configResolved(config) {
      resolved = config;
    },

    buildStart() {
      assertNoStemCollision(
        toEntryList(options.content),
        toEntryList(options.scripts),
      );

      const watchTargets = [
        ...toEntryList(options.content),
        ...toEntryList(options.scripts),
        ...(options.background ? [options.background] : []),
        ...(typeof options.manifest === 'string' ? [options.manifest] : []),
      ];

      for (const target of watchTargets) {
        this.addWatchFile(path.resolve(resolved.root, target));
      }
    },

    writeBundle(_options, bundle) {
      const html = Object.keys(bundle).find((file) => file.endsWith('.html'));
      if (html) popupOutput = html;
    },

    closeBundle() {
      const ctx: SubBuildContext = {
        root: resolved.root,
        mode: resolved.mode,
        outDir: path.resolve(resolved.root, resolved.build.outDir),
        resolve: resolved.resolve,
        define: resolved.define,
        envPrefix: resolved.envPrefix,
        inheritedPlugins,
      };

      const warn = (message: string) => {
        resolved.logger.warn(`[vite-plugin-ex-girl] ${message}`);
      };

      const run = () => runExtensionBuild(options, ctx, popupOutput, warn);

      // watch 재빌드가 겹쳐도 서브빌드가 같은 산출물을 두고 경합하지 않게 직렬화
      queue = queue.then(run, run);

      if (resolved.build.watch) {
        return queue.catch((error: unknown) => {
          resolved.logger.error(
            `[vite-plugin-ex-girl] ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }

      return queue;
    },
  };
}
