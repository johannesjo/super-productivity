/**
 * Minimal operation interface for migrations.
 * Uses only primitives - no framework dependencies.
 */
export interface OperationLike {
  id: string;
  opType: string;
  entityType: string;
  entityId?: string;
  entityIds?: string[];
  payload: unknown;
  schemaVersion: number;
}

/**
 * Defines a schema migration from one version to the next.
 * Migrations must be pure functions with no external dependencies.
 */
export interface SchemaMigration {
  /** Source version this migration applies to */
  fromVersion: number;

  /** Target version after migration */
  toVersion: number;

  /** Human-readable description of what changed */
  description: string;

  /**
   * Transform a full state snapshot from fromVersion to toVersion.
   * Must be a pure function.
   * @param state - The state object (shape depends on fromVersion)
   * @returns Transformed state for toVersion
   */
  migrateState: (state: unknown) => unknown;

  /**
   * Transform an individual operation payload.
   * Return null to drop the operation entirely (e.g., for removed features).
   * Only required for non-additive changes (renames, removals, type changes).
   */
  migrateOperation?: (op: OperationLike) => OperationLike | null;

  /**
   * Explicit declaration that forces migration authors to think about
   * whether operations need migration. If true but migrateOperation
   * is undefined, validation fails at startup.
   */
  requiresOperationMigration: boolean;
}

/**
 * Result of a migration operation.
 */
export interface MigrationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  migratedFromVersion?: number;
  migratedToVersion?: number;
}

/**
 * State cache with schema version for migration tracking.
 */
export interface MigratableStateCache {
  state: unknown;
  schemaVersion?: number;
}
