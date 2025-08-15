// NOTE: do not change!!
export enum SyncProviderId {
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
  'LocalFile' = 'LocalFile',
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
