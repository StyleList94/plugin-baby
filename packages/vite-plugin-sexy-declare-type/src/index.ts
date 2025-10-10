import type { Plugin, ResolvedConfig } from 'vite';

import path from 'node:path';
import { styleText } from 'node:util';

import ts from 'typescript';

export default function sexyDeclareType(): Plugin {
  let config: ResolvedConfig;
  let entryFiles: string[] = [];

  return {
    name: 'vite-plugin-sexy-declare-type',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      const libConfig = config.build.lib;

      if (!libConfig) {
        console.warn(
          '[sexy-declare-type] Only works with Vite library mode. Skipping.',
        );
        return;
      }

      const entry = typeof libConfig === 'object' ? libConfig.entry : undefined;

      if (!entry) {
        console.warn(
          '[sexy-declare-type] No entry found in library config. Skipping.',
        );
        return;
      }

      if (typeof entry === 'string') {
        entryFiles = [path.resolve(config.root, entry)];
      } else if (Array.isArray(entry)) {
        entryFiles = entry.map((e) => path.resolve(config.root, e));
      } else {
        entryFiles = Object.values(entry).map((e) =>
          path.resolve(config.root, e),
        );
      }
    },

    closeBundle: async () => {
      if (entryFiles.length === 0) return;

      const startTime = performance.now();

      const compilerOptions: ts.CompilerOptions = {
        declaration: true,
        emitDeclarationOnly: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        outDir: path.resolve(config.root, config.build.outDir),
        esModuleInterop: true,
        jsx: ts.JsxEmit.Preserve,
      };

      const host = ts.createCompilerHost(compilerOptions);
      const program = ts.createProgram(entryFiles, compilerOptions, host);
      program.emit(undefined, undefined, undefined, true);

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      const filesCount = program
        .getSourceFiles()
        .filter((f) => !f.fileName.includes('node_modules')).length;

      console.log(
        `${styleText('green', '✓')} Sexy declarations ready in ${styleText('dim', `${duration}s`)} ${styleText('green', `(${filesCount} files)`)}`,
      );
    },
  };
}
