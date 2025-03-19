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
  Conflict = 'Conflict',
  IncompleteRemoteData = 'IncompleteRemoteData',
  NotConfigured = 'NotConfigured',
}

export const LOCK_FILE_CHECK_INTERVAL = 5000;

export const LOG_PREFIX = 'pf' as const;

export const REMOTE_FILE_CONTENT_PREFIX = 'pf_' as const;
export const LOCK_FILE_NAME = '__lock' as const;

export enum DBNames {
  CredentialsStorePrefix = '__sp_cred_',
  ClientId = '__client_id_',
  MetaModel = '__meta_',
}
