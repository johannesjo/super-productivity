import { Injectable } from '@angular/core';
import { Operation, VectorClock } from '../operation.types';
import { PFLog } from '../../../log';

/**
 * Current schema version for the operation log state cache.
 * Increment this when making breaking changes to the state structure.
 */
export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_VERSION_SKIP = 5;

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
 * Interface for schema migrations (A.7.15 Unified State and Operation Migrations).
 * Each migration transforms state from one version to the next, and optionally
 * transforms individual operations for tail ops replay and conflict detection.
 *
 * @see docs/ai/sync/operation-log-architecture.md A.7.15
 */
export interface SchemaMigration {
  fromVersion: number;
  toVersion: number;
  description: string;

  /** Required: transform full state snapshot */
  migrateState: (state: unknown) => unknown;

  /**
   * Optional: transform individual operation.
   * Return null to drop the operation entirely (e.g., for removed features).
   * Only needed for non-additive changes (renames, removals, type changes).
   */
  migrateOperation?: (op: Operation) => Operation | null;

  /**
   * Explicit declaration forces author to think about operation migration.
   * If true but migrateOperation is undefined, startup validation fails.
   */
  requiresOperationMigration: boolean;
}

/**
 * Registry of all schema migrations.
 * Add new migrations here when the state structure changes.
 *
 * NOTE: This is for Operation Log schema migrations (Post-v10 / Post-OpLog).
 * For legacy migrations (upgrading from older versions of the app), see:
 * `src/app/pfapi/migrate/cross-model-migrations.ts`
 *
 * Example migration (additive change - no operation migration needed):
 * ```typescript
 * {
 *   fromVersion: 1,
 *   toVersion: 2,
 *   description: 'Add priority field to tasks',
 *   requiresOperationMigration: false,
 *   migrateState: (state) => {
 *     const s = state as any;
 *     if (!s.task?.entities) return state;
 *     const entities = Object.fromEntries(
 *       Object.entries(s.task.entities).map(([id, task]: [string, any]) => [
 *         id,
 *         { ...task, priority: task.priority ?? 'NORMAL' },
 *       ])
 *     );
 *     return { ...s, task: { ...s.task, entities } };
 *   },
 * },
 * ```
 *
 * Example migration (field rename - operation migration required):
 * ```typescript
 * {
 *   fromVersion: 2,
 *   toVersion: 3,
 *   description: 'Rename task.estimate to task.timeEstimate',
 *   requiresOperationMigration: true,
 *   migrateState: (state) => { ... },
 *   migrateOperation: (op) => {
 *     if (op.entityType !== 'TASK' || op.opType !== 'UPD') return op;
 *     const changes = (op.payload as any)?.changes;
 *     if (!changes?.estimate) return op;
 *     return {
 *       ...op,
 *       schemaVersion: 3,
 *       payload: { ...op.payload, changes: { ...changes, timeEstimate: changes.estimate, estimate: undefined } },
 *     };
 *   },
 * },
 * ```
 */
const MIGRATIONS: SchemaMigration[] = [
  // No migrations yet - schema version 1 is the initial version
  // Add migrations here as needed
];

/**
 * Service responsible for migrating state cache snapshots and operations
 * between schema versions.
 *
 * When the application's state structure changes (e.g., new fields, renamed properties),
 * migrations ensure old snapshots and operations can be upgraded to work with new code.
 *
 * Migration strategy for state (A.7.1):
 * 1. Load snapshot from SUP_OPS
 * 2. Check if schemaVersion < CURRENT_SCHEMA_VERSION
 * 3. If so, run migrations sequentially until current version
 * 4. Save migrated snapshot back to SUP_OPS
 * 5. Continue with normal hydration
 *
 * Migration strategy for operations (A.7.13):
 * 1. Load tail ops after snapshot
 * 2. For each op where op.schemaVersion < CURRENT_SCHEMA_VERSION:
 *    - Run migrateOperation() to transform payload
 *    - Drop op if migration returns null
 * 3. Apply migrated ops to migrated state
 *
 * @see docs/ai/sync/operation-log-architecture.md A.7
 */
@Injectable({ providedIn: 'root' })
export class SchemaMigrationService {
  constructor() {
    // Validate migration registry on startup (A.7.15)
    this._validateMigrationRegistry();
  }

  /**
   * Validates that all migrations with requiresOperationMigration=true
   * have a migrateOperation function defined.
   */
  private _validateMigrationRegistry(): void {
    for (const migration of MIGRATIONS) {
      if (migration.requiresOperationMigration && !migration.migrateOperation) {
        throw new Error(
          `SchemaMigrationService: Migration v${migration.fromVersion}→v${migration.toVersion} ` +
            `declares requiresOperationMigration=true but migrateOperation is not defined. ` +
            `Either implement migrateOperation or set requiresOperationMigration=false.`,
        );
      }
    }
  }

  /**
   * Migrates a state cache to the current schema version if needed.
   * Returns the migrated cache, or the original if no migration was needed.
   */
  migrateStateIfNeeded(cache: MigratableStateCache): MigratableStateCache {
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
      `SchemaMigrationService: Migrating state from v${currentVersion} to v${CURRENT_SCHEMA_VERSION}`,
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
        `SchemaMigrationService: Running state migration v${migration.fromVersion} → v${migration.toVersion}: ${migration.description}`,
      );

      try {
        state = migration.migrateState(state);
        version = migration.toVersion;
      } catch (e) {
        PFLog.err(
          `SchemaMigrationService: State migration failed at v${migration.fromVersion} → v${migration.toVersion}`,
          e,
        );
        throw new Error(
          `Schema state migration failed: ${migration.description}. ` +
            `Error: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    PFLog.normal(`SchemaMigrationService: State migration complete. Now at v${version}`);

    return {
      ...cache,
      state,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  /**
   * @deprecated Use migrateStateIfNeeded instead
   */
  migrateIfNeeded(cache: MigratableStateCache): MigratableStateCache {
    return this.migrateStateIfNeeded(cache);
  }

  /**
   * Migrates a single operation to the current schema version if needed.
   * Returns null if the operation should be dropped (e.g., for removed features).
   *
   * @param op - The operation to migrate
   * @returns The migrated operation, or null if it should be dropped
   */
  migrateOperation(op: Operation): Operation | null {
    const opVersion = op.schemaVersion ?? 1;

    if (opVersion >= CURRENT_SCHEMA_VERSION) {
      return op;
    }

    let migratedOp: Operation | null = { ...op };
    let version = opVersion;

    while (version < CURRENT_SCHEMA_VERSION && migratedOp !== null) {
      const migration = MIGRATIONS.find((m) => m.fromVersion === version);

      if (!migration) {
        throw new Error(
          `SchemaMigrationService: No migration path from version ${version}. ` +
            `Current version is ${CURRENT_SCHEMA_VERSION}.`,
        );
      }

      if (migration.migrateOperation) {
        try {
          migratedOp = migration.migrateOperation(migratedOp);
          if (migratedOp !== null) {
            // Update schema version on the operation
            migratedOp = { ...migratedOp, schemaVersion: migration.toVersion };
          }
        } catch (e) {
          PFLog.err(
            `SchemaMigrationService: Operation migration failed at v${migration.fromVersion} → v${migration.toVersion}`,
            e,
          );
          throw new Error(
            `Schema operation migration failed: ${migration.description}. ` +
              `Error: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      } else {
        // No operation migration defined - just update version
        migratedOp = { ...migratedOp, schemaVersion: migration.toVersion };
      }

      version = migration.toVersion;
    }

    return migratedOp;
  }

  /**
   * Migrates an array of operations, filtering out any that should be dropped.
   *
   * @param ops - The operations to migrate
   * @returns Array of migrated operations (dropped operations excluded)
   */
  migrateOperations(ops: Operation[]): Operation[] {
    const migrated: Operation[] = [];

    for (const op of ops) {
      const migratedOp = this.migrateOperation(op);
      if (migratedOp !== null) {
        migrated.push(migratedOp);
      } else {
        PFLog.normal(
          `SchemaMigrationService: Dropped operation ${op.id} (${op.actionType}) during migration`,
        );
      }
    }

    return migrated;
  }

  /**
   * Returns true if the cache needs migration.
   */
  needsMigration(cache: MigratableStateCache): boolean {
    const currentVersion = cache.schemaVersion ?? 1;
    return currentVersion < CURRENT_SCHEMA_VERSION;
  }

  /**
   * Returns true if the operation needs migration.
   */
  operationNeedsMigration(op: Operation): boolean {
    const opVersion = op.schemaVersion ?? 1;
    return opVersion < CURRENT_SCHEMA_VERSION;
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
