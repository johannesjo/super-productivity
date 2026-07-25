import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateMigrationRegistry } from '../src/migrate';
import { MIGRATIONS } from '../src/migrations';
import { CURRENT_SCHEMA_VERSION } from '../src/schema-version';

type RuntimeSurface = 'reducer' | 'persistence' | 'cursor';

interface SharedSchemaEvidence {
  kind: 'shared-schema-spec';
  specPath: `tests/${string}.spec.ts`;
}

interface ReleasedOracleEvidence {
  kind: 'pinned-released-oracle';
  oracleSpecPath: `tests/released-client-oracles/${string}.spec.ts`;
  cohorts: readonly {
    releaseTag: `v${string}`;
    commitSha: string;
    sourcePath: string;
    sourceBlobSha: string;
  }[];
}

interface CompatibilityAssessment {
  toVersion: number;
  runtimeSurfaces: readonly RuntimeSurface[];
  evidence: SharedSchemaEvidence | ReleasedOracleEvidence;
}

/**
 * Schemas through v4 were reviewed historically, before this evidence gate.
 * This does not claim that the current-client forward-schema E2E exercises a
 * released legacy receiver.
 *
 * Do not add a generic old-app bundle here. Add one assessment per future
 * migration. A package-only migration may cite a shared-schema spec; behavior
 * reaching reducers, persistence, or cursor acknowledgement needs a small,
 * deterministic oracle pinned to the affected released cohort.
 */
const POLICY_BASELINE_SCHEMA_VERSION = 4;
const COMPATIBILITY_ASSESSMENTS: readonly CompatibilityAssessment[] = [];

const expectExistingSpec = (specPath: string): void => {
  expect(
    existsSync(resolve(process.cwd(), specPath)),
    `Compatibility evidence does not exist: ${specPath}`,
  ).toBe(true);
};

describe('released-client compatibility policy', () => {
  it('requires an explicit assessment for every schema after the audited baseline', () => {
    expect(validateMigrationRegistry()).toEqual([]);
    expect(CURRENT_SCHEMA_VERSION).toBe(MIGRATIONS.at(-1)?.toVersion);

    const migrationVersions = MIGRATIONS.filter(
      ({ toVersion }) => toVersion > POLICY_BASELINE_SCHEMA_VERSION,
    )
      .map(({ toVersion }) => toVersion)
      .sort((a, b) => a - b);
    const assessmentVersions = COMPATIBILITY_ASSESSMENTS.map(
      ({ toVersion }) => toVersion,
    ).sort((a, b) => a - b);

    expect(new Set(assessmentVersions).size).toBe(assessmentVersions.length);
    expect(assessmentVersions).toEqual(migrationVersions);
  });

  it('requires a pinned released oracle for runtime-visible migration semantics', () => {
    for (const assessment of COMPATIBILITY_ASSESSMENTS) {
      if (assessment.runtimeSurfaces.length === 0) {
        expect(assessment.evidence.kind).toBe('shared-schema-spec');
        if (assessment.evidence.kind === 'shared-schema-spec') {
          expectExistingSpec(assessment.evidence.specPath);
        }
        continue;
      }

      expect(assessment.evidence.kind).toBe('pinned-released-oracle');
      if (assessment.evidence.kind !== 'pinned-released-oracle') {
        continue;
      }

      expectExistingSpec(assessment.evidence.oracleSpecPath);
      expect(assessment.evidence.cohorts.length).toBeGreaterThan(0);
      for (const cohort of assessment.evidence.cohorts) {
        expect(cohort.releaseTag).toMatch(/^v\d+\.\d+\.\d+/);
        expect(cohort.commitSha).toMatch(/^[0-9a-f]{40}$/);
        expect(cohort.sourcePath.length).toBeGreaterThan(0);
        expect(cohort.sourceBlobSha).toMatch(/^[0-9a-f]{40}$/);
      }
    }
  });
});
