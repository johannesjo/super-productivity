import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import './locales/en';
import { resolveDict } from './i18n';

// Phase 6 "translations infrastructure linted": every `t('key')` used in the
// client UI must resolve in the authoritative `en` locale. Adding a UI string
// without its translation fails this gate.

const clientSrc = resolve(fileURLToPath(import.meta.url), '../../../..', 'apps/client/src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path;
  });

const usedKeys = (): string[] => {
  const keys = new Set<string>();
  const sourceFiles = walk(clientSrc).filter((path) =>
    /\.(svelte|svelte\.ts|svelte\.js|ts|js)$/.test(path),
  );
  for (const path of sourceFiles) {
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(/\bt\(\s*'([A-Za-z0-9_.-]+)'/g)) {
      keys.add(match[1]);
    }
  }
  return [...keys];
};

describe('i18n translation coverage', () => {
  it('every UI translate key is defined in the en locale', () => {
    const keys = usedKeys();
    expect(keys.length).toBeGreaterThan(10);
    const en = resolveDict('en');
    const missing = keys.filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });
});
