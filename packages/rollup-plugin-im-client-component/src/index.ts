import type { Plugin } from 'rollup';

import MagicString from 'magic-string';
import picomatch from 'picomatch';

import {
  DEFAULT_CLIENT_PATTERNS,
  detectClientImports,
  mergePatterns,
  type ClientDirectiveOptions,
  type ClientPattern,
} from './core';

export type { ClientDirectiveOptions, ClientPattern };
export { DEFAULT_CLIENT_PATTERNS };

/**
 * Rollup plugin that automatically detects client-side React API imports
 * and injects `'use client'` directive into build output modules.
 *
 * @remarks
 * - Analyzes import specifiers in each output chunk using es-module-lexer
 * - Does NOT transitively mark files (only direct imports trigger injection)
 * - Works with `preserveModules: true`
 * - Preserves source maps via MagicString
 * - Compatible with Vite, Rollup, and Rolldown
 *
 * @param options - Configuration options
 * @returns A Rollup plugin instance
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import clientDirective from 'rollup-plugin-im-client-component';
 *
 * export default defineConfig({
 *   plugins: [clientDirective()],
 * })
 * ```
 *
 * @example
 * ```ts
 * // With extra patterns for third-party client libraries
 * clientDirective({
 *   extraPatterns: [
 *     { source: /^@radix-ui\/react-/ },
 *     { source: /^motion\// },
 *   ],
 * })
 * ```
 *
 * @public
 */
export default function clientDirective(
  options: ClientDirectiveOptions = {},
): Plugin {
  const {
    clientPatterns,
    extraPatterns = [],
    exclude = ['**/*.css.js'],
    include = [],
    directive = 'use client',
  } = options;

  const patterns = clientPatterns
    ? [...clientPatterns, ...extraPatterns]
    : mergePatterns(DEFAULT_CLIENT_PATTERNS, extraPatterns);

  const isExcluded = exclude.length > 0 ? picomatch(exclude) : () => false;
  const isIncluded = include.length > 0 ? picomatch(include) : () => false;

  return {
    name: 'rollup-plugin-im-client-component',

    async renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js') && !chunk.fileName.endsWith('.mjs')) {
        return null;
      }

      if (isExcluded(chunk.fileName)) {
        return null;
      }

      const trimmed = code.trimStart();
      if (
        trimmed.startsWith("'use client'") ||
        trimmed.startsWith('"use client"')
      ) {
        return null;
      }

      const forceInclude = isIncluded(chunk.fileName);
      const isClient =
        forceInclude || (await detectClientImports(code, patterns));

      if (!isClient) return null;

      const s = new MagicString(code);
      s.prepend(`'${directive}';\n`);

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      };
    },
  };
}
