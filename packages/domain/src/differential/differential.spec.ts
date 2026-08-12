import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runFixture, type DifferentialFixture } from './harness';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const loadFixtures = (): DifferentialFixture[] =>
  readdirSync(fixturesDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map(
      (name) =>
        JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as DifferentialFixture,
    );

describe('differential fixture harness (ADR-003 determinism)', () => {
  const fixtures = loadFixtures();

  it('has at least one baseline fixture', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(1);
  });

  for (const fixture of fixtures) {
    it(`reproduces the captured ${fixture.engine} state: ${fixture.id}`, () => {
      const { actual, expected } = runFixture(fixture);
      expect(actual).toEqual(expected);
    });
  }

  it('normalized states are JSON-safe and deep-ordered', () => {
    const { actual } = runFixture(fixtures[0]);
    expect(JSON.parse(JSON.stringify(actual))).toEqual(actual);
  });
});
