interface SVGIconProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Icon size. Sets both width and height.
   * Takes precedence over width and height props.
   */
  size?: number | string;
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
