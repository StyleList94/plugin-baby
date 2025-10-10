import { config } from '@plugin-baby/eslint-config/base';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
