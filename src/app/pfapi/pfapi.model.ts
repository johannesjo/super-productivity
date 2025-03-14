import { Observable } from 'rxjs';
import { SyncGetRevResult } from '../imex/sync/sync.model';
import { PFAPIDatabaseAdapter } from './db/pfapi-database-adapter.model';

// TODO limit T to object or array
export interface PFAPIModelCfg<T> {
  modelFileGroup?: string;
  modelVersion: number;
  migrations?: {
    [version: string]: (arg: T) => T;
  };
  isAlwaysReApplyOldMigrations?: boolean;
  debounceDbWrite?: number;
  defaultData?: T;
}

// export type PFAPIModelCfgs = readonly PFAPIModelCfg<unknown>[];
export type PFAPIModelCfgs = {
  [modelId: string]: PFAPIModelCfg<unknown>;
};

export interface PFAPIFullData<F> {
  data: F;
}

export interface PFAPIBaseCfg {
  dbAdapter?: PFAPIDatabaseAdapter;
  onDbError?: (err: any) => void;
  pollInterval?: number;
  isEncryptData?: boolean;
  encryptKey?: string;
  isCreateBackups?: boolean;
  crossModelVersion?: number;
  crossModelMigrations?: {
    [version: string]: (arg: PFAPIFullData<unknown>) => PFAPIFullData<unknown>;
  };
  // TODO
  // backupInterval?: 'daily';
  // isUseLockFile?: boolean;
  // translateFN: (key)=> translate(key),
}

export interface PFAPIRevMap {
  [modelOrFileGroupId: string]: string;
}

export interface PFAPIMetaFileContent {
  lastLocalSyncModelUpdate?: number;
  lastSync?: number;
  metaRev?: string;
  // revision map
  revMap: PFAPIRevMap;
}

export interface PFAPICompleteBackup {
  timestamp: number;
  data: { [modelGroupId: string]: any };
}

// NOTE: do not change!!
export enum PFAPISyncProviderId {
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
  'LocalFile' = 'LocalFile',
}

export interface PFAPISyncProviderServiceInterface {
  id: PFAPISyncProviderId;
  isUploadForcePossible?: boolean;
  isReady$: Observable<boolean>;

  getFileRevAndLastClientUpdate(
    target: string,
    localRev: string | null,
    // TODO maybe remove clientUpdate
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult>;

  uploadFileData(
    syncTarget: string,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error>;

  downloadFileData(
    syncTarget: string,
    // TODO maybe remove localRev
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string }>;
}
