import { Observable } from 'rxjs';
import { SyncGetRevResult } from '../imex/sync/sync.model';

export interface PFAPIModelCfg<T> {
  id: string;
  modelFileGroup?: string;
  dbAdapter?: string;
  modelVersion: number;
  migrations: {
    [version: string]: (arg: T) => T;
  };
  isAlwaysReApplyOldMigrations?: boolean;
}

export interface PFAPICfg {
  // translateFN: (key)=> translate(key),
  modelCfgs: PFAPIModelCfg<any>[];
  pollInterval?: number;
  isEncryptData?: boolean;
  isUseLockFile?: boolean;
  isCreateBackups?: boolean;
  backupInterval?: 'daily';
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
  data: { [modelId: string]: any };
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
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult>;

  uploadFileData(
    syncTarget: string,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error>;

  downloadFileData(
    syncTarget: string,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string }>;
}
