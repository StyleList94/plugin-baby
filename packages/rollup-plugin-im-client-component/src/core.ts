import { init, parse } from 'es-module-lexer';

/**
 * A pattern describing an import source that indicates client-side usage.
 *
 * @public
 */
export interface ClientPattern {
  /**
   * The import source to match against.
   * String values use exact match.
   * RegExp values test against the full import source.
   */
  source: string | RegExp;

  /**
   * Optional list of import specifiers (named imports) that trigger detection.
   * If omitted, any import from the source triggers detection.
   * If provided, at least one specifier must be present in the import.
   */
  specifiers?: string[];
}

/**
 * Options for rollup-plugin-im-client-component.
 *
 * @public
 */
export interface ClientDirectiveOptions {
  /**
   * Import source patterns that indicate client-side usage.
   * When set, replaces the default patterns entirely.
   */
  clientPatterns?: ClientPattern[];

  /**
   * Additional patterns to merge with the defaults.
   * Use this when you want to keep the default detection but add
   * project-specific sources.
   * @defaultValue `[]`
   */
  extraPatterns?: ClientPattern[];

  /**
   * Glob patterns for files to exclude from directive injection,
   * even if client APIs are detected.
   * @defaultValue `['**\/*.css.js']`
   */
  exclude?: string[];

  /**
   * Glob patterns for files to always include (force inject directive),
   * regardless of detection results.
   * @defaultValue `[]`
   */
  include?: string[];

  /**
   * The directive string to inject.
   * @defaultValue `'use client'`
   */
  directive?: string;
}

/**
 * Default patterns covering React client-side APIs.
 * `react/jsx-runtime` is intentionally excluded (all components use it).
 *
 * @public
 */
export const DEFAULT_CLIENT_PATTERNS: ClientPattern[] = [
  {
    source: 'react',
    specifiers: [
      // Hooks
      'useState',
      'useEffect',
      'useRef',
      'useCallback',
      'useMemo',
      'useContext',
      'useReducer',
      'useId',
      'useLayoutEffect',
      'useInsertionEffect',
      'useImperativeHandle',
      'useDebugValue',
      'useSyncExternalStore',
      'useTransition',
      'useDeferredValue',
      'useOptimistic',
      'useActionState',
      // Client APIs
      'use',
      'createContext',
      'forwardRef',
      'memo',
      'lazy',
      'startTransition',
    ],
  },
  {
    source: 'react-dom',
    specifiers: ['createPortal', 'flushSync'],
  },
];

/**
 * Merge default patterns with extra patterns.
 * @internal
 */
export function mergePatterns(
  defaults: ClientPattern[],
  extra: ClientPattern[],
): ClientPattern[] {
  return [...defaults, ...extra];
}

/**
 * Check if a source string matches a pattern source.
 * @internal
 */
function matchSource(source: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return source === pattern;
  }
  return pattern.test(source);
}

/**
 * Extract named import specifiers from an import statement string.
 * e.g. `import { useState as V, useRef as j } from "react"` → `['useState', 'useRef']`
 * @internal
 */
function extractSpecifiers(statement: string): string[] {
  // Namespace import: import * as name from '...'
  if (/\*\s+as\s+/.test(statement)) {
    return ['*'];
  }

  // Named imports: import { a, b as c, d } from '...'
  const namedMatch = /\{([^}]+)\}/.exec(statement);
  if (namedMatch) {
    return namedMatch[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
  }

  // Default import or side-effect import
  return [];
}

/**
 * Detect whether a code chunk imports client-side APIs.
 *
 * @param code - The chunk's source code
 * @param patterns - Client patterns to match against
 * @returns `true` if client imports are detected
 *
 * @internal
 */
export async function detectClientImports(
  code: string,
  patterns: ClientPattern[],
): Promise<boolean> {
  await init;
  const [imports] = parse(code);

  for (const imp of imports) {
    const source = imp.n;
    if (source) {
      for (const pattern of patterns) {
        if (matchSource(source, pattern.source)) {
          // No specifiers constraint → any import from this source triggers
          if (!pattern.specifiers) return true;

          // Extract named specifiers from the import statement
          const statement = code.slice(imp.ss, imp.se);
          const specifiers = extractSpecifiers(statement);

          // Namespace import matches all specifiers
          if (specifiers.includes('*')) return true;

          // Check if any imported specifier matches the pattern
          const { specifiers: patternSpecifiers } = pattern;
          if (specifiers.some((s) => patternSpecifiers.includes(s))) {
            return true;
          }
        }
      }
    }
  }

  return false;
}
