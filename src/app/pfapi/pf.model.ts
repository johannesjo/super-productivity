import { PFDatabaseAdapter } from './db/pf-database-adapter.model';
import { PFModelCtrl } from './pf-model-ctrl';

type JSONPrimitive = string | number | boolean | null;
type Serializable = JSONPrimitive | SerializableObject | SerializableArray;

interface SerializableObject {
  // TODO fix serializable check
  // [key: string]: Serializable | any;
  [key: string]: any;
}

type SerializableArray = Array<Serializable>;

export type PFModelBase = SerializableObject | SerializableArray;

export interface PFModelCfg<T extends PFModelBase> {
  modelVersion: number;
  isLocalOnly?: boolean;
  // migrations?: {
  //   [version: string]: (arg: T) => T;
  // };
  // TODO fix typing
  // migrations?: Record<string, (arg: T) => T>;
  isAlwaysReApplyOldMigrations?: boolean;
  debounceDbWrite?: number;

  // MAYBE?
  validate?: (data: any) => boolean;
  repair?: (data: any) => T;

  // MAYBE?
  // TODO fix typing
  // transformBeforeSave?: <I>(data: I) => T;
  // TODO fix typing
  // transformBeforeLoad?: <I>(data: T) => I;

  defaultData?: T;
  // TODO decide to kick or not
  // modelFileGroup?: string;
}

// export type PFModelCfgs = readonly PFModelCfg<unknown>[];
export type PFModelCfgs = {
  [modelId: string]: PFModelCfg<PFModelBase>;
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
  validate?: (data: any) => boolean;
  // TODO type
  repair?: (data: any) => any;

  // TODO
  // backupInterval?: 'daily';
  // isUseLockFile?: boolean;PFBaseCfg
  // translateFN: (key)=> translate(key),
}

export interface PFRevMap {
  [modelOrFileGroupId: string]: string;
}

export interface PFModelVersionMap {
  [modelId: string]: number;
}

export interface PFMetaFileContent {
  lastLocalSyncModelUpdate?: number;
  lastSync?: number;
  metaRev?: string;
  // revision map
  revMap: PFRevMap;
  crossModelVersion: number;
  modelVersions: PFModelVersionMap;
}

export interface PFCompleteBackup {
  timestamp: number;
  data: { [modelGroupId: string]: any };
}

export type PFExtractModelCfgType<T extends PFModelCfg<PFModelBase>> =
  T extends PFModelCfg<infer U> ? U : never;

export type PFModelCfgToModelCtrl<T extends PFModelCfgs> = {
  [K in keyof T]: PFModelCtrl<PFExtractModelCfgType<T[K]>>;
};

export type PFCompleteModel<T extends PFModelCfgs> = {
  [K in keyof T]: PFExtractModelCfgType<T[K]>;
};
