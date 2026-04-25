import type { Plugin } from 'vite';
import type { SVGProps } from 'react';

import { readFileSync } from 'node:fs';

import { transformWithEsbuild } from 'vite';
import { transform } from '@svgr/core';
import { createFilter } from '@rollup/pluginutils';

/**
 * Configuration options for this plugin.
 * @public
 */
export type PluginOptions = {
  /**
   * Files to exclude from SVG processing.
   * Can be a string glob pattern, array of patterns, or RegExp.
   * @defaultValue `/node_modules/`
   * @example
   * ```ts
   * exclude: ['**\/icons\/*.svg', /\.component\.svg$/]
   * ```
   */
  exclude?: string | string[] | RegExp;

  /**
   * Default size to apply to SVG icons when size prop is not provided.
   * This value is used as a fallback in the size resolution chain.
   * @defaultValue `undefined`
   * @example
   * ```ts
   * defaultIconSize: 24
   * // or
   * defaultIconSize: '1.5rem'
   * ```
   */
  defaultIconSize?: number | string;

  /**
   * Default props to apply to all SVG elements.
   * These props will be merged with the SVG component props.
   * @defaultValue `undefined`
   * @example
   * ```ts
   * defaultProps: {
   *   focusable: false,
   *   'aria-hidden': true,
   *   role: 'img'
   * }
   * ```
   */
  defaultProps?: Partial<SVGProps<SVGSVGElement>>;
};

/**
 * Internal type for splitting module ID into filepath and query string.
 * @internal
 */
type ResultSplitId = [string, string | undefined];

/**
 * Creates a Vite plugin for transforming SVG files into React components with enhanced styling capabilities.
 *
 * @remarks
 * This plugin provides multiple import modes:
 * - `?react` - Standard React component
 * - `?icon` - Enhanced icon component with size and color props (applies to both fill and stroke)
 * - `?icon-fill` - Enhanced icon component with color applied to fill only
 * - `?icon-stroke` - Enhanced icon component with color applied to stroke only
 *
 * The enhanced icon components support the following props:
 * - `size` - Sets both width and height
 * - `color` - Sets the SVG color using currentColor
 * - `width`, `height` - Individual dimension control
 * - `style` - Additional styles (color from style.color is respected)
 *
 * @param options - Configuration options for the plugin
 * @returns A Vite plugin instance
 *
 * @example
 *
 * ```tsx
 * // Standard React component
 * import Brand from './brand.svg?react'
 * <Brand />
 *
 * // Enhanced icon with size and color control
 * import BrandIcon from './brand.svg?icon'
 * <BrandIcon size="1.5rem" color="#41D1FF" />
 *
 * // Icon with fill color control only
 * import BrandIcon from './brand.svg?icon-fill'
 * <BrandIcon size={24} color="#BD34FE" />
 *
 * // Icon with stroke color control only
 * import BrandIcon from './brand.svg?icon-stroke'
 * <BrandIcon width={24} height={24} color="#FFEA83" />
 * ```
 *
 * @public
 */
export default function reactStylishSvg(options: PluginOptions = {}): Plugin {
  const { exclude = /node_modules/, defaultIconSize, defaultProps } = options;
  const filter = createFilter(/\.svg$/, exclude);

  const replaceDimension = (jsxCode: string, attr: 'width' | 'height') =>
    jsxCode.replace(
      new RegExp(`${attr}=(?:["']([^"']+)["']|\\{([^}]+)\\})`),
      (_match: string, quoted?: string, braced?: string) => {
        const originalValue = quoted ?? braced ?? '';
        const isNumeric = /^\d+$/.test(originalValue);
        const fallbackChain = defaultIconSize
          ? `size ?? ${attr} ?? ${defaultIconSize} ?? ${isNumeric ? originalValue : `"${originalValue}"`}`
          : `size ?? ${attr} ?? ${isNumeric ? originalValue : `"${originalValue}"`}`;
        return `${attr}={${fallbackChain}}`;
      },
    );

  const replaceColorAttr = (jsxCode: string, attr: 'fill' | 'stroke') =>
    jsxCode.replace(
      new RegExp(`${attr}=["']([^"']+)["']`, 'g'),
      (match, colorValue) => {
        if (colorValue === 'none') return match;
        return `${attr}={color || style?.color ? 'currentColor' : '${colorValue}'}`;
      },
    );

  const serializeAttribute = (key: string, value: unknown): string => {
    if (typeof value === 'string') return `${key}="${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean')
      return `${key}={${value}}`;
    if (typeof value === 'object' && value !== null)
      return `${key}={${JSON.stringify(value)}}`;
    return '';
  };

  return {
    name: 'vite-plugin-react-stylish-svg',
    enforce: 'pre',

    async load(id) {
      const [filepath, query] = id.split('?');
      if (!filter(filepath)) return null;

      if (!query || (query !== 'react' && !query.startsWith('icon'))) {
        return null;
      }

      try {
        return readFileSync(filepath, 'utf-8');
      } catch {
        return null;
      }
    },

    async transform(code, id) {
      const [filepath, query] = id.split('?') as ResultSplitId;
      if (!filter(filepath)) return null;

      const isReactOrIcon = query === 'react' || query?.startsWith('icon');
      if (!isReactOrIcon) return null;

      let colorTarget: 'fill' | 'stroke' | 'both' = 'both';

      if (query === 'icon-fill') colorTarget = 'fill';
      else if (query === 'icon-stroke') colorTarget = 'stroke';

      try {
        let jsxCode = await transform(
          code,
          { plugins: ['@svgr/plugin-jsx'] },
          { componentName: 'SvgComponent', filePath: filepath },
        );

        if (colorTarget === 'fill' || colorTarget === 'both') {
          jsxCode = replaceColorAttr(jsxCode, 'fill');
        }
        if (colorTarget === 'stroke' || colorTarget === 'both') {
          jsxCode = replaceColorAttr(jsxCode, 'stroke');
        }

        jsxCode = jsxCode.replace(
          /const SvgComponent = props =>/,
          'const SvgComponent = ({ color, size, width, height, style, ...props }) =>',
        );

        jsxCode = (['width', 'height'] as const).reduce(
          (acc, attr) => replaceDimension(acc, attr),
          jsxCode,
        );

        let svgAttributes = '';
        if (defaultProps) {
          svgAttributes = Object.entries(defaultProps)
            .map(([key, value]) => serializeAttribute(key, value))
            .filter(Boolean)
            .join(' ');
        }

        jsxCode = jsxCode.replace(
          /<svg /,
          `<svg ${svgAttributes ? `${svgAttributes} ` : ''}style={color ? { ...style, color } : style} `,
        );

        const result = await transformWithEsbuild(jsxCode, filepath, {
          loader: 'jsx',
          jsx: 'automatic',
        });

        return {
          code: result.code,
          map: result.map,
        };
      } catch {
        return null;
      }
    },
  };
}
