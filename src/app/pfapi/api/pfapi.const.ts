// NOTE: do not change!!
export enum SyncProviderId {
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
  'LocalFile' = 'LocalFile',
  'SuperSync' = 'SuperSync',
}

export enum SyncStatus {
  InSync = 'InSync',
  UpdateRemote = 'UpdateRemote',
  UpdateRemoteAll = 'UpdateRemoteAll',
  UpdateLocal = 'UpdateLocal',
  UpdateLocalAll = 'UpdateLocalAll',
  Conflict = 'Conflict',
  IncompleteRemoteData = 'IncompleteRemoteData',
  NotConfigured = 'NotConfigured',
}

export enum ConflictReason {
  NoLastSync = 'NoLastSync',
  BothNewerLastSync = 'BothNewerLastSync',
  MatchingModelChangeButLastSyncMismatch = 'MatchingModelChangeButLastSyncMismatch',
  UnexpectedRevMismatch = 'UnexpectedRevMismatch',
}

export const REMOTE_FILE_CONTENT_PREFIX = 'pf_' as const;

export const PFAPI_MIGRATE_FORCE_VERSION_LS_KEY = 'PFAPI_MIGRATE_FORCE_VERSION' as const;

export enum DBNames {
  PrivateCfgStorePrefix = '__sp_cred_',
  ClientId = '__client_id_',
  MetaModel = '__meta_',
  TmpBackup = '__TMP_BACKUP',
}

/**
 * Model keys that are allowed to be written to IndexedDB during sync operations.
 *
 * ## Architecture Background
 *
 * The app uses an operation-log-based architecture where:
 *
 * 1. **Operation logs are the source of truth** for all sync providers (SuperSync, WebDAV, Dropbox)
 * 2. **Entity state (tasks, tags, projects, etc.) lives only in NgRx store**, reconstructed
 *    from operations during hydration
 * 3. **Entity data is NOT persisted to IndexedDB** - it's derived from operations
 *
 * ## Why Only Archives?
 *
 * Archive models (`archiveYoung`, `archiveOld`) are the exception because:
 * - They contain historical task data that can be very large
 * - They're rarely accessed during normal operation
 * - Storing them separately avoids replaying thousands of archive operations on every startup
 * - They're written via `ArchiveOperationHandler` when archive-affecting operations are applied
 *
 * ## What Happens to Other Keys?
 *
 * When `updateLocalMainModelsFromRemoteMetaFile()` receives entity data in `mainModelData`:
 * - Entity keys (task, tag, project, etc.) are **filtered out and not written**
 * - Entity state is reconstructed from operation logs via `OperationApplierService`
 * - `PfapiStoreDelegateService` reads current entity state directly from NgRx store
 *
 * ## Related Components
 *
 * - `PfapiStoreDelegateService`: Reads entity state from NgRx (not IndexedDB)
 * - `OperationApplierService`: Applies operations to reconstruct entity state
 * - `ArchiveOperationHandler`: Handles archive writes during operation application
 * - `ModelSyncService.updateLocalMainModelsFromRemoteMetaFile()`: Uses this filter
 *
 * @see src/app/pfapi/pfapi-store-delegate.service.ts
 * @see src/app/core/persistence/operation-log/processing/operation-applier.service.ts
 * @see src/app/core/persistence/operation-log/processing/archive-operation-handler.service.ts
 */
export const ALLOWED_DB_WRITE_KEYS_DURING_SYNC = ['archiveYoung', 'archiveOld'] as const;
