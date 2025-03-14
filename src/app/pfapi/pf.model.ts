import { PFDatabaseAdapter } from './db/pf-database-adapter.model';

// TODO limit T to object or array
export interface PFModelCfg<T> {
  modelFileGroup?: string;
  modelVersion: number;
  migrations?: {
    [version: string]: (arg: T) => T;
  };
  isAlwaysReApplyOldMigrations?: boolean;
  debounceDbWrite?: number;
  defaultData?: T;
}

// export type PFModelCfgs = readonly PFModelCfg<unknown>[];
export type PFModelCfgs = {
  [modelId: string]: PFModelCfg<unknown>;
};

export interface PFFullData<F> {
  data: F;
}

export interface PFBaseCfg {
  dbAdapter?: PFDatabaseAdapter;
  onDbError?: (err: any) => void;
  pollInterval?: number;
  isEncryptData?: boolean;
  encryptKey?: string;
  isCreateBackups?: boolean;
  crossModelVersion?: number;
  crossModelMigrations?: {
    [version: string]: (arg: PFFullData<unknown>) => PFFullData<unknown>;
  };
  // TODO
  // backupInterval?: 'daily';
  // isUseLockFile?: boolean;
  // translateFN: (key)=> translate(key),
}

export interface PFRevMap {
  [modelOrFileGroupId: string]: string;
}

export interface PFMetaFileContent {
  lastLocalSyncModelUpdate?: number;
  lastSync?: number;
  metaRev?: string;
  // revision map
  revMap: PFRevMap;
}

export interface PFCompleteBackup {
  timestamp: number;
  data: { [modelGroupId: string]: any };
}

// NOTE: do not change!!
export enum PFSyncProviderId {
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
  'LocalFile' = 'LocalFile',
}
