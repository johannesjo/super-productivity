import { DatabaseAdapter } from './db/database-adapter.model';
import { ModelCtrl } from './model-ctrl/model-ctrl';
import { ConflictReason } from './pfapi.const';

type JSONPrimitive = string | number | boolean | null;
type Serializable = JSONPrimitive | SerializableObject | SerializableArray;

interface SerializableObject {
  // TODO fix serializable check
  // [key: string]: Serializable;
  [key: string]: any;
}

type SerializableArray = Array<Serializable>;

export type ModelBase = SerializableObject | SerializableArray | unknown;

export interface ModelCfg<T extends ModelBase> {
  modelVersion: number;
  isLocalOnly?: boolean;
  // migrations?: {
  //   [version: string]: (arg: T) => T;
  // };
  // TODO fix typing
  // migrations?: Record<string, (arg: T) => T>;
  isAlwaysReApplyOldMigrations?: boolean;
  debounceDbWrite?: number;
  // for cascading only
  isMainFileModel?: boolean;

  // MAYBE? TODO
  // validate?: (data: any) => boolean;
  // repair?: (data: any) => T;

  // MAYBE? TODO
  // transformBeforeSave?: <I>(data: I) => T;
  // transformBeforeLoad?: <I>(data: T) => I;
  // transformBeforeUpload?: <I>(data: I) => T;
  // transformBeforeDownload?: <I>(data: T) => I;

  defaultData?: T;
  // TODO decide to kick or not
  // modelFileGroup?: string;
}

// export type ModelCfgs = readonly ModelCfg<unknown>[];
export type ModelCfgs = {
  [modelId: string]: ModelCfg<ModelBase>;
};

export interface FullData<F> {
  data: F;
}

// TODO better type
// maybe Partial<AllModelData>
export interface MainModelData {
  [modelId: string]: ModelBase;
}

export interface PfapiBaseCfg<T extends ModelCfgs> {
  dbAdapter?: DatabaseAdapter;
  onDbError?: (err: any) => void;
  pollInterval?: number;
  isMainFileMode?: boolean;
  // TODO needs to be dynamically settable
  isEncryptData?: boolean;
  encryptKey?: string;
  isCreateBackups?: boolean;
  crossModelVersion?: number;
  crossModelMigrations?: {
    [version: string]: (arg: FullData<unknown>) => FullData<unknown>;
  };
  validate?: (data: AllModelData<T>) => boolean;
  repair?: <R>(data: R | unknown) => AllModelData<T>;

  // TODO
  // backupInterval?: 'daily';
  // isUseLockFile?: boolean;BaseCfg
  // translateFN: (key)=> translate(key),
}

export interface RevMap {
  [modelOrFileGroupId: string]: string;
}

export interface ModelVersionMap {
  [modelId: string]: number;
}

export interface MetaFileBase {
  lastUpdate: number;
  revMap: RevMap;
  crossModelVersion: number;
  modelVersions: ModelVersionMap;
}

export interface RemoteMeta extends MetaFileBase {
  mainModelData?: MainModelData;
}

export interface LocalMeta extends MetaFileBase {
  lastSyncedUpdate: number | null;
  metaRev: string | null;
}

export interface ConflictData {
  reason: ConflictReason;
  remote: RemoteMeta;
  local: LocalMeta;
  additional?: unknown;
}

export interface CompleteBackup<T extends ModelCfgs> {
  timestamp: number;
  lastUpdate: number;
  crossModelVersion: number;
  modelVersions: ModelVersionMap;
  data: AllModelData<T>;
}

export type ExtractModelCfgType<T extends ModelCfg<ModelBase>> =
  T extends ModelCfg<infer U> ? U : never;

export type ModelCfgToModelCtrl<T extends ModelCfgs> = {
  [K in keyof T]: ModelCtrl<ExtractModelCfgType<T[K]>>;
};

export type AllModelData<T extends ModelCfgs> = {
  [K in keyof T]: ExtractModelCfgType<T[K]>;
};

export type AllSyncModels<T extends ModelCfgs> = {
  [K in keyof T]: ExtractModelCfgType<T[K]>;
};

// TODO better typing
export type AllPrivateModels<T extends ModelCfgs> = {
  [K in keyof T]: ExtractModelCfgType<T[K]>;
};

export interface CompleteExport<T extends ModelCfgs> {
  meta: LocalMeta;
  sync: AllSyncModels<T>;
  local: AllPrivateModels<T>;
  cred: {
    [providerId: string]: unknown;
  };
}

export type PfapiEvents = 'syncDone' | 'syncStart' | 'syncError' | 'metaModelChange';
