// Schema version constants
export {
  CURRENT_SCHEMA_VERSION,
  MIN_SUPPORTED_SCHEMA_VERSION,
  PROJECT_DELETE_WINS_SCHEMA_VERSION,
} from './schema-version';

// Types
export type {
  OperationLike,
  SchemaMigration,
  MigrationResult,
  MigratableStateCache,
} from './migration.types';

// Migration functions
export {
  migrateState,
  migrateOperation,
  migrateOperations,
  stateNeedsMigration,
  operationNeedsMigration,
  validateMigrationRegistry,
  getCurrentSchemaVersion,
} from './migrate';

// Migration registry (for inspection/debugging)
export { MIGRATIONS } from './migrations/index';

// Entity types (shared between client and server)
export type { EntityType } from './entity-types';
export { ENTITY_TYPES } from './entity-types';

// NouraSync HTTP contract (shared between client and server)
export {
  NOURA_SYNC_CLIENT_ID_REGEX,
  NOURA_SYNC_MAX_CLIENT_ID_LENGTH,
  NOURA_SYNC_MAX_OPS_PER_UPLOAD,
  NOURA_SYNC_MAX_ENTITY_IDS_PER_OP,
  NOURA_SYNC_OP_TYPES,
  NOURA_SYNC_IMPORT_REASONS,
  NOURA_SYNC_SNAPSHOT_REASONS,
  NOURA_SYNC_SNAPSHOT_OP_TYPES,
  NouraSyncVectorClockSchema,
  NouraSyncClientIdSchema,
  NouraSyncOperationSchema,
  NouraSyncUploadOpsRequestSchema,
  NouraSyncDownloadOpsQuerySchema,
  NouraSyncUploadSnapshotRequestSchema,
  NouraSyncOperationResponseSchema,
  NouraSyncServerOperationSchema,
  NouraSyncUploadResultSchema,
  NouraSyncUploadOpsResponseSchema,
  NouraSyncDownloadOpsResponseSchema,
  NouraSyncSnapshotResponseSchema,
  NouraSyncSnapshotUploadResponseSchema,
  NouraSyncStatusResponseSchema,
  NouraSyncRestorePointSchema,
  NouraSyncRestorePointsResponseSchema,
  NouraSyncRestoreSnapshotResponseSchema,
  NouraSyncDeleteAllDataResponseSchema,
} from './nourasync-http-contract';
export type {
  NouraSyncOpType,
  NouraSyncImportReason,
  NouraSyncSnapshotReason,
  NouraSyncSnapshotOpType,
  NouraSyncOperation,
  NouraSyncUploadOpsRequest,
  NouraSyncDownloadOpsQuery,
  NouraSyncUploadSnapshotRequest,
  NouraSyncServerOperation,
  NouraSyncUploadResult,
  NouraSyncUploadOpsResponse,
  NouraSyncDownloadOpsResponse,
  NouraSyncSnapshotResponse,
  NouraSyncSnapshotUploadResponse,
  NouraSyncStatusResponse,
  NouraSyncRestorePoint,
  NouraSyncRestorePointsResponse,
  NouraSyncRestoreSnapshotResponse,
  NouraSyncDeleteAllDataResponse,
} from './nourasync-http-contract';
