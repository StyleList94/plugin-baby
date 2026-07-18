import type { ExGirlOptions, ManifestV3 } from '../src/core';

import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import { build, type Logger } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';

import exGirl from '../src/index';


const fixtureRoot = path.resolve(import.meta.dirname, 'fixtures/basic');
const outDirs: string[] = [];

function makeOutDir(name: string): string {
  const dir = path.join(fixtureRoot, `dist-${name}`);
  outDirs.push(dir);
  return dir;
}

function captureLogger(): { logger: Logger; warnings: string[] } {
  const warnings: string[] = [];
  const logger: Logger = {
    hasWarned: false,
    info: () => undefined,
    warn: (message) => {
      warnings.push(message);
    },
    warnOnce: (message) => {
      warnings.push(message);
    },
    error: () => undefined,
    clearScreen: () => undefined,
    hasErrorLogged: () => false,
  };

  return { logger, warnings };
}

async function buildFixture(
  outDir: string,
  pluginOptions: ExGirlOptions,
  logger?: Logger,
): Promise<void> {
  await build({
    root: fixtureRoot,
    configFile: false,
    ...(logger ? { customLogger: logger } : { logLevel: 'silent' }),
    build: { outDir, emptyOutDir: true },
    plugins: [exGirl(pluginOptions)],
  });
}

function readOutput(outDir: string, file: string): string {
  return readFileSync(path.join(outDir, file), 'utf-8');
}

function readManifest(outDir: string): ManifestV3 {
  return JSON.parse(readOutput(outDir, 'manifest.json')) as ManifestV3;
}

afterAll(() => {
  for (const dir of outDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('full extension build', () => {
  const outDir = makeOutDir('full');
  const options: ExGirlOptions = {
    manifest: 'src/manifest.json',
    content: 'src/scripts/content.ts',
    background: 'src/background.ts',
    scripts: 'src/scripts/extra.ts',
  };

  it('emits content script as a single IIFE without module syntax', async () => {
    await buildFixture(outDir, options);

    const content = readOutput(outDir, 'scripts/content.js');

    expect(content).toMatch(/\(function|\(\)\s*=>/);
    expect(content).not.toMatch(/^\s*import[\s(]/m);
    expect(content).not.toMatch(/^\s*export\s/m);
    // 동적 import(helper)와 정적 import(shared)가 전부 인라인됐는지
    expect(content).toContain('helper-inlined');
    expect(content).toContain('content-loaded');
  });

  it('emits unmapped extra script and ESM background', () => {
    const extra = readOutput(outDir, 'scripts/extra.js');
    const background = readOutput(outDir, 'background.js');

    expect(extra).toContain('extra-standalone');
    expect(background).toContain('bg-ready');
    expect(JSON.stringify(readManifest(outDir))).not.toContain('extra');
  });

  it('maps manifest entries to built outputs', () => {
    const manifest = readManifest(outDir);

    expect(manifest.content_scripts?.[0].js).toEqual(['scripts/content.js']);
    expect(manifest.content_scripts?.[0].css).toEqual(['styles/base.css']);
    expect(manifest.background?.service_worker).toBe('background.js');
    expect(manifest.background?.type).toBe('module');
    expect(manifest.action?.default_popup).toBe('index.html');
    expect(manifest.version).toBe('3.2.1');
  });

  it('keeps main pass outputs (popup html, assets, public dir)', () => {
    expect(existsSync(path.join(outDir, 'index.html'))).toBe(true);
    expect(readOutput(outDir, 'index.html')).toContain('assets/');
    expect(existsSync(path.join(outDir, 'styles/base.css'))).toBe(true);
  });
});

describe('option variations', () => {
  it('warns and passes through when content option is omitted', async () => {
    const outDir = makeOutDir('no-content');
    const { logger, warnings } = captureLogger();

    await buildFixture(
      outDir,
      { manifest: 'src/manifest.json', background: 'src/background.ts' },
      logger,
    );

    const manifest = readManifest(outDir);

    expect(warnings.join('\n')).toContain('content');
    expect(manifest.content_scripts?.[0].js).toEqual([
      'src/scripts/content.ts',
    ]);
  });

  it('keeps manifest version when syncVersion is disabled', async () => {
    const outDir = makeOutDir('no-sync');

    await buildFixture(outDir, {
      manifest: 'src/manifest.json',
      content: 'src/scripts/content.ts',
      syncVersion: false,
    });

    expect(readManifest(outDir).version).toBe('0.0.0');
  });
});

describe('failure cases', () => {
  it('rejects when content and scripts collide on output name', async () => {
    const outDir = makeOutDir('collision');

    await expect(
      buildFixture(outDir, {
        manifest: 'src/manifest.json',
        content: 'src/scripts/content.ts',
        scripts: 'src/other/content.ts',
      }),
    ).rejects.toThrow(/collision/);
  });

  it('rejects when an entry file is missing', async () => {
    const outDir = makeOutDir('missing');

    await expect(
      buildFixture(outDir, {
        manifest: 'src/manifest.json',
        content: 'src/scripts/nope.ts',
      }),
    ).rejects.toThrow(/nope\.ts/);
  });
});
