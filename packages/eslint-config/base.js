import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import stylish from 'eslint-config-stylish';
import stylishTypeScript from 'eslint-config-stylish/typescript';
import tseslint from 'typescript-eslint';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = defineConfig(
  {
    ignores: ['dist/**', '*.config.[jt]s'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    extends: [stylish],
    rules: {
      'import/prefer-default-export': 'off',
    },
  },
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
      sourceType: 'module',
      ecmaVersion: 12,
    },
    extends: [stylishTypeScript],
  },
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },

  eslintConfigPrettier,
);
