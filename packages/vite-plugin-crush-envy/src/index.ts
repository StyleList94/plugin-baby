import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

import { generateEnvTypes, type CrushEnvyOptions } from './core';

export type { CrushEnvyOptions };

/**
 * Vite plugin that generates TypeScript types from .env files.
 *
 * @remarks
 * This plugin automatically generates a TypeScript declaration file
 * containing types for all environment variables found in .env files.
 * It supports multiple .env files (.env, .env.local, .env.development, etc.)
 * and merges all keys into a single type definition.
 *
 * @param options - Configuration options for the plugin
 * @returns A Vite plugin instance
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import crushEnvy from 'vite-plugin-crush-envy'
 *
 * export default {
 *   plugins: [crushEnvy()]
 * }
 * ```
 *
 * @example
 * ```ts
 * // With custom output path
 * import crushEnvy from 'vite-plugin-crush-envy'
 *
 * export default {
 *   plugins: [crushEnvy({ output: 'types/env.d.ts' })]
 * }
 * ```
 *
 * @public
 */
export default function crushEnvy(options: CrushEnvyOptions = {}): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'vite-plugin-crush-envy',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      generateEnvTypes(config.root, options);
    },

    configureServer(server: ViteDevServer) {
      const watchEnvFiles = () => {
        server.watcher.add('.env*');
        server.watcher.on('change', (file: string) => {
          if (file.includes('.env')) {
            generateEnvTypes(config.root, options);
          }
        });
        server.watcher.on('add', (file: string) => {
          if (file.includes('.env')) {
            generateEnvTypes(config.root, options);
          }
        });
        server.watcher.on('unlink', (file: string) => {
          if (file.includes('.env')) {
            generateEnvTypes(config.root, options);
          }
        });
      };

      watchEnvFiles();
    },
  };
}
