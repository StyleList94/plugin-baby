/**
 * Props for SVG icon components created by vite-plugin-react-stylish-svg.
 * Extends standard SVG element props with additional styling capabilities.
 * @public
 */
interface SVGIconProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Icon size. Sets both width and height.
   * Takes precedence over width and height props.
   * @example
   * ```tsx
   * <Icon size={24} />        // 24px
   * <Icon size="1.5rem" />    // 1.5rem
   * ```
   */
  size?: number | string;

  /**
   * Icon color. Sets the color using CSS currentColor.
   * Works with both fill and stroke attributes depending on import mode.
   * @example
   * ```tsx
   * <Icon color="blue" />
   * <Icon color="##646CFF" />
   * <Icon style={{ color: 'red' }} /> // Also works via style.color
   * ```
   */
  color?: string;
}

declare module '*.svg?react' {
  const component: React.FC<React.SVGProps<SVGSVGElement>>;
  export default component;
}

declare module '*.svg?icon' {
  const component: React.FC<SVGIconProps>;
  export default component;
}

declare module '*.svg?icon-fill' {
  const component: React.FC<SVGIconProps>;
  export default component;
}

declare module '*.svg?icon-stroke' {
  const component: React.FC<SVGIconProps>;
  export default component;
}
