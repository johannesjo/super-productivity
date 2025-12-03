import { VectorClock } from '../../../pfapi/api/util/vector-clock';
export { VectorClock };

export enum OpType {
  Create = 'CRT',
  Update = 'UPD',
  Delete = 'DEL',
  Move = 'MOV', // For list reordering
  Batch = 'BATCH', // For bulk operations (import, mass update)
  SyncImport = 'SYNC_IMPORT', // Full state import from remote sync
  BackupImport = 'BACKUP_IMPORT', // Full state import from backup file
}

export type EntityType =
  | 'TASK'
  | 'PROJECT'
  | 'TAG'
  | 'NOTE'
  | 'GLOBAL_CONFIG'
  | 'SIMPLE_COUNTER'
  | 'WORK_CONTEXT'
  | 'TASK_REPEAT_CFG'
  | 'ISSUE_PROVIDER'
  | 'PLANNER'
  | 'MIGRATION'
  | 'RECOVERY' // For disaster recovery imports
  | 'ALL'; // For full state imports (sync, backup)

export interface Operation {
  // IDENTITY
  id: string; // UUID v7 (time-ordered, better for sorting)

  // ACTION MAPPING
  actionType: string; // NgRx Action type (e.g., '[Task] Update')
  opType: OpType; // High-level operation category

  // SCOPE
  entityType: EntityType; // 'TASK' | 'PROJECT' | 'TAG' | 'NOTE' | 'GLOBAL_CONFIG' | 'SIMPLE_COUNTER'
  entityId?: string; // ID of the affected entity (or '*' for global config)
  entityIds?: string[]; // For batch operations

  // DATA
  // Validated by Typia.
  // For large text fields (Notes), consider storing diffs instead of full content in future iterations.
  payload: unknown;

  // CAUSALITY & ORDERING
  clientId: string; // Device generating the op (reuse existing from vector-clock)
  vectorClock: VectorClock; // State of the world AFTER this Op
  timestamp: number; // Wall clock time (ISO 8601 or epoch ms)

  // META
  schemaVersion: number; // For future migrations
  parentOpId?: string; // For conflict resolution chains
}

export interface OperationLogEntry {
  seq: number; // Local, monotonic auto-increment (IndexedDB primary key)
  op: Operation;
  appliedAt: number; // When this op was applied locally (epoch ms)
  source: 'local' | 'remote'; // Origin of this operation
  syncedAt?: number; // When successfully synced to remote (null if pending)
}

export interface EntityConflict {
  entityType: EntityType;
  entityId: string;
  localOps: Operation[]; // Local ops affecting this entity
  remoteOps: Operation[]; // Remote ops affecting the same entity
  suggestedResolution: 'local' | 'remote' | 'merge' | 'manual';
  mergedPayload?: unknown; // If auto-mergeable
}

export interface ConflictResult {
  nonConflicting: Operation[];
  conflicts: EntityConflict[];
}

export interface OperationLogManifest {
  version: number; // For future migrations of manifest structure
  operationFiles: string[]; // List of all uploaded operation files
  lastCompactedSeq?: number; // The sequence number of the last op included in a full state snapshot
  lastCompactedSnapshotFile?: string; // Reference to the last full state snapshot file
}
