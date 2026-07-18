import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  assertNoStemCollision,
  loadManifest,
  readConsumerVersion,
  stemOf,
  toEntryList,
  transformManifest,
  type ManifestV3,
} from '../src/core';

const baseManifest = (): ManifestV3 => ({
  manifest_version: 3,
  name: 'Fixture',
  version: '0.0.0',
  action: { default_popup: 'src/popup/index.html' },
  background: { service_worker: 'src/background.ts' },
  content_scripts: [
    {
      matches: ['https://*/*'],
      js: ['src/scripts/content.ts'],
      css: ['styles/base.css'],
    },
  ],
  permissions: ['storage'],
});

describe('toEntryList', () => {
  it('returns empty list for undefined', () => {
    expect(toEntryList(undefined)).toEqual([]);
  });

  it('wraps a single string', () => {
    expect(toEntryList('src/a.ts')).toEqual(['src/a.ts']);
  });

  it('keeps arrays as-is', () => {
    expect(toEntryList(['a.ts', 'b.ts'])).toEqual(['a.ts', 'b.ts']);
  });
});

describe('stemOf', () => {
  it('strips directory and extension', () => {
    expect(stemOf('src/scripts/content.ts')).toBe('content');
  });

  it('handles .tsx and nested dots', () => {
    expect(stemOf('src/over.ride.tsx')).toBe('over.ride');
  });
});

describe('assertNoStemCollision', () => {
  it('passes when all stems are unique', () => {
    expect(() =>
      assertNoStemCollision(['src/a/content.ts'], ['src/b/extra.ts']),
    ).not.toThrow();
  });

  it('throws when content and scripts collide on output name', () => {
    expect(() =>
      assertNoStemCollision(['src/a/content.ts'], ['src/b/content.ts']),
    ).toThrow(/content/);
  });
});

describe('transformManifest', () => {
  it('maps content_scripts js entries in order', () => {
    const warn = vi.fn();
    const result = transformManifest(
      baseManifest(),
      { contentOutputs: ['scripts/content.js'], popup: 'index.html' },
      warn,
    );

    expect(result.content_scripts?.[0].js).toEqual(['scripts/content.js']);
  });

  it('preserves css and unknown fields untouched', () => {
    const warn = vi.fn();
    const result = transformManifest(
      baseManifest(),
      { contentOutputs: ['scripts/content.js'], popup: 'index.html' },
      warn,
    );

    expect(result.content_scripts?.[0].css).toEqual(['styles/base.css']);
    expect(result.content_scripts?.[0].matches).toEqual(['https://*/*']);
    expect(result.permissions).toEqual(['storage']);
  });

  it('maps background service_worker and popup', () => {
    const warn = vi.fn();
    const result = transformManifest(
      baseManifest(),
      {
        contentOutputs: ['scripts/content.js'],
        background: 'background.js',
        popup: 'index.html',
      },
      warn,
    );

    expect(result.background?.service_worker).toBe('background.js');
    expect(result.action?.default_popup).toBe('index.html');
  });

  it('warns and forces background.type to module when missing', () => {
    const warn = vi.fn();
    const result = transformManifest(
      baseManifest(),
      {
        contentOutputs: [],
        background: 'background.js',
        popup: 'index.html',
      },
      warn,
    );

    expect(result.background?.type).toBe('module');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('module'));
  });

  it('does not warn when background.type is already module', () => {
    const warn = vi.fn();
    const manifest = baseManifest();
    delete manifest.content_scripts;
    manifest.background = {
      service_worker: 'src/background.ts',
      type: 'module',
    };

    transformManifest(
      manifest,
      { contentOutputs: [], background: 'background.js', popup: 'index.html' },
      warn,
    );

    expect(warn).not.toHaveBeenCalled();
  });

  it('syncs version when mapping.version is set', () => {
    const warn = vi.fn();
    const result = transformManifest(
      baseManifest(),
      { contentOutputs: [], popup: 'index.html', version: '3.2.1' },
      warn,
    );

    expect(result.version).toBe('3.2.1');
  });

  it('keeps original version when mapping.version is undefined', () => {
    const warn = vi.fn();
    const result = transformManifest(
      baseManifest(),
      { contentOutputs: [], popup: 'index.html' },
      warn,
    );

    expect(result.version).toBe('0.0.0');
  });

  it('warns but passes through when manifest has content_scripts and no content outputs', () => {
    const warn = vi.fn();
    const result = transformManifest(
      baseManifest(),
      { contentOutputs: [], popup: 'index.html' },
      warn,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('content'));
    expect(result.content_scripts?.[0].js).toEqual(['src/scripts/content.ts']);
  });

  it('never mutates the input manifest', () => {
    const warn = vi.fn();
    const input = baseManifest();
    const snapshot = structuredClone(input);

    transformManifest(
      input,
      {
        contentOutputs: ['scripts/content.js'],
        background: 'background.js',
        popup: 'index.html',
        version: '3.2.1',
      },
      warn,
    );

    expect(input).toEqual(snapshot);
  });
});

describe('loadManifest / readConsumerVersion', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ex-girl-'));

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads manifest from a path relative to root', () => {
    writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify(baseManifest()),
    );

    const result = loadManifest('manifest.json', dir);

    expect(result.name).toBe('Fixture');
  });

  it('clones object sources so later edits stay isolated', () => {
    const source = baseManifest();
    const result = loadManifest(source, dir);

    expect(result).not.toBe(source);
    expect(result.content_scripts).not.toBe(source.content_scripts);
  });

  it('throws a clear error when the manifest file is missing', () => {
    expect(() => loadManifest('nope/missing.json', dir)).toThrow(
      /missing\.json/,
    );
  });

  it('throws a clear error on invalid JSON', () => {
    writeFileSync(path.join(dir, 'broken.json'), '{ nope');

    expect(() => loadManifest('broken.json', dir)).toThrow(/broken\.json/);
  });

  it('reads version from the consumer package.json', () => {
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '3.2.1' }),
    );

    expect(readConsumerVersion(dir)).toBe('3.2.1');
  });

  it('returns undefined when package.json is absent', () => {
    const empty = mkdtempSync(path.join(tmpdir(), 'ex-girl-empty-'));

    expect(readConsumerVersion(empty)).toBeUndefined();

    rmSync(empty, { recursive: true, force: true });
  });
});
