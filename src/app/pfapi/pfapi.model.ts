export interface PfapiModelCfg<T> {
  id: string;
  modelFileGroup?: string;
  dbAdapter?: string;
  modelVersion: number;
  migrations: {
    [version: string]: (arg: T) => T;
  };
  isAlwaysReApplyOldMigrations?: boolean;
}

export interface PfapiCfg {
  // translateFN: (key)=> translate(key),
  modelCfgs: PfapiModelCfg<any>[];
  pollInterval?: number;
  isEncryptData?: boolean;
  isUseLockFile?: boolean;
  isCreateBackups?: boolean;
  backupInterval?: 'daily';
}

export interface PfapiMetaFileContent {
  lastLocalSyncModelUpdate?: number;
  lastSync?: number;
  // revision map
  revMap: {
    [modelOrFileGroupId: string]: string;
  };
}
