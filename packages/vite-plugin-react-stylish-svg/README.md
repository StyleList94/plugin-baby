# Vite Plugin React Stylish SVG

Stylishly handling SVG in Vite + React

[![npm](https://img.shields.io/npm/v/vite-plugin-react-stylish-svg)](https://www.npmjs.com/package/vite-plugin-react-stylish-svg)

## Features

- ✨ import SVG as React component or Data URL
- 🎯 query-based import modes
- ⚡ Powered by SVGR
- 📦 TypeScript support
- 🎨 Dynamic color control via `color` prop
- 📏 Flexible sizing with `size` prop (icon query only)

## Getting Started

### Requires

- Vite 7.0.0+
- React 18.0.0+

### install

```bash
pnpm add -D vite-plugin-react-stylish-svg
```

## Quick Start

### Add plugin to Vite config

`vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactStylishSvg from 'vite-plugin-react-stylish-svg';

export default defineConfig({
  plugins: [react(), reactStylishSvg()],
});
```

### Add type declarations

You can add type declarations in two ways.

`vite-env.d.ts`

```diff
/// <reference types="vite/client" />
+ /// <reference types="vite-plugin-react-stylish-svg/types" />
```

or `tsconfig.json`

```json
{
  "compilerOptions": {
    "types": ["vite-plugin-react-stylish-svg/types"]
  }
}
```

### Usage

`App.tsx`

```tsx
import Icon from './icon.svg?react'; // import as React component

function App() {
  return <Icon />;
}
```

## Import Modes

### React Component

query: `?react`

```tsx
import Icon from './icon.svg?react';
<Icon color="red" size={24} />;
```

### Icon mode

query: `?icon` , `?icon-fill` , `?icon-stroke`

There are two features.

- change fill color with `color` prop
- set square size with `size` prop (high priority over width and height)

```tsx
// Both fill and stroke
import Icon from './icon.svg?icon';
<Icon color="blue" />;

// Fill only
import IconFill from './icon.svg?icon-fill';
<IconFill color="green" />;

// Stroke only
import IconStroke from './icon.svg?icon-stroke';
<IconStroke color="yellow" />;

// Set square size
import IconSize from './icon.svg?icon';
<IconSize size={48} />;

// export as component
export { default as Icon } from './icon.svg?icon';
```

### No Query

Vite will automatically convert the SVG to a Data URL.

```tsx
import iconUrl from './icon.svg';
<img src={iconUrl} alt="icon" />;
```

## More information

### Props type

`?react`

```typescript
type ComponentProps = React.SVGProps<SVGSVGElement>;
```

`?icon` , `?icon-fill` , `?icon-stroke`

```typescript
interface SVGIconProps extends React.SVGProps<SVGSVGElement> {
  color?: string; // Icon color
  size?: number | string; // Sets both width and height
}
```

### Plugin Options

```typescript
type PluginOptions = {
  /* exclude files from processing */
  exclude?: string | string[] | RegExp;
  /* default size when size prop not provided */
  defaultIconSize?: number | string;
  /* default props for all SVG elements */
  defaultProps?: Partial<SVGProps<SVGSVGElement>>;
};
```
