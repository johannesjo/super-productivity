import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PARITY_LEDGER, parityOwnerFiles } from './parity-registry';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('parity ledger (docs/parity.md is machine-checkable)', () => {
  it('covers every in-scope surface with an owning file', () => {
    expect(PARITY_LEDGER.length).toBeGreaterThan(0);
    expect(PARITY_LEDGER.some((area) => area.area === 'Domain core')).toBe(true);
    expect(PARITY_LEDGER.some((area) => area.area === 'Sync server (retained)')).toBe(
      true,
    );
  });

  it('references only files that exist and are non-empty', () => {
    for (const path of parityOwnerFiles()) {
      const absolute = join(repoRoot, path);
      expect(existsSync(absolute), `${path} should exist`).toBe(true);
      expect(readFileSync(absolute, 'utf8').trim().length).toBeGreaterThan(0);
    }
  });

  it('every owned capability links a test when the spec claims one', () => {
    for (const area of PARITY_LEDGER) {
      for (const entry of area.entries) {
        if (!entry.tests) continue;
        const absolute = join(repoRoot, entry.tests);
        expect(
          existsSync(absolute),
          `${entry.tests} should exist for ${entry.feature}`,
        ).toBe(true);
      }
    }
  });
});
