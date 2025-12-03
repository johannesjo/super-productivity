import { Injectable } from '@angular/core';
import { VectorClock } from './operation.types';
import { PFLog } from '../../log';

/**
 * Current schema version for the operation log state cache.
 * Increment this when making breaking changes to the state structure.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Interface for state cache that may need migration.
 */
export interface MigratableStateCache {
  state: unknown;
  lastAppliedOpSeq: number;
  vectorClock: VectorClock;
  compactedAt: number;
  schemaVersion?: number; // Optional for backward compatibility with old caches
}

/**
 * Interface for schema migrations.
 * Each migration transforms state from one version to the next.
 */
export interface SchemaMigration {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (state: unknown) => unknown;
}

/**
 * Registry of all schema migrations.
 * Add new migrations here when the state structure changes.
 *
 * NOTE: This is for Operation Log schema migrations (Post-v10 / Post-OpLog).
 * For legacy migrations (upgrading from older versions of the app), see:
 * `src/app/pfapi/migrate/cross-model-migrations.ts`
 *
 * Example migration:
 * ```typescript
 * {
 *   fromVersion: 1,
 *   toVersion: 2,
 *   description: 'Add new field to tasks',
 *   migrate: (state) => ({
 *     ...state,
 *     task: {
 *       ...(state as any).task,
 *       // Transform task state here
 *     },
 *   }),
 * },
 * ```
 */
const MIGRATIONS: SchemaMigration[] = [
  // No migrations yet - schema version 1 is the initial version
  // Add migrations here as needed
];

/**
 * Service responsible for migrating state cache snapshots between schema versions.
 *
 * When the application's state structure changes (e.g., new fields, renamed properties),
 * migrations ensure old snapshots can be upgraded to work with new code.
 *
 * Migration strategy:
 * 1. Load snapshot from SUP_OPS
 * 2. Check if schemaVersion < CURRENT_SCHEMA_VERSION
 * 3. If so, run migrations sequentially until current version
 * 4. Save migrated snapshot back to SUP_OPS
 * 5. Continue with normal hydration
 */
@Injectable({ providedIn: 'root' })
export class SchemaMigrationService {
  /**
   * Migrates a state cache to the current schema version if needed.
   * Returns the migrated cache, or the original if no migration was needed.
   */
  migrateIfNeeded(cache: MigratableStateCache): MigratableStateCache {
    // Handle old caches that don't have schemaVersion
    const currentVersion = cache.schemaVersion ?? 1;

    if (currentVersion >= CURRENT_SCHEMA_VERSION) {
      // Already at current version
      return {
        ...cache,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
    }

    PFLog.normal(
      `SchemaMigrationService: Migrating from v${currentVersion} to v${CURRENT_SCHEMA_VERSION}`,
    );

    let { state } = cache;
    let version = currentVersion;

    // Run migrations sequentially
    while (version < CURRENT_SCHEMA_VERSION) {
      const migration = MIGRATIONS.find((m) => m.fromVersion === version);

      if (!migration) {
        throw new Error(
          `SchemaMigrationService: No migration path from version ${version}. ` +
            `Current version is ${CURRENT_SCHEMA_VERSION}.`,
        );
      }

      PFLog.normal(
        `SchemaMigrationService: Running migration v${migration.fromVersion} → v${migration.toVersion}: ${migration.description}`,
      );

      try {
        state = migration.migrate(state);
        version = migration.toVersion;
      } catch (e) {
        PFLog.err(
          `SchemaMigrationService: Migration failed at v${migration.fromVersion} → v${migration.toVersion}`,
          e,
        );
        throw new Error(
          `Schema migration failed: ${migration.description}. ` +
            `Error: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    PFLog.normal(`SchemaMigrationService: Migration complete. Now at v${version}`);

    return {
      ...cache,
      state,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  /**
   * Returns true if the cache needs migration.
   */
  needsMigration(cache: MigratableStateCache): boolean {
    const currentVersion = cache.schemaVersion ?? 1;
    return currentVersion < CURRENT_SCHEMA_VERSION;
  }

  /**
   * Returns the current schema version.
   */
  getCurrentVersion(): number {
    return CURRENT_SCHEMA_VERSION;
  }

  /**
   * Returns all registered migrations (for debugging/testing).
   */
  getMigrations(): readonly SchemaMigration[] {
    return MIGRATIONS;
  }
}
