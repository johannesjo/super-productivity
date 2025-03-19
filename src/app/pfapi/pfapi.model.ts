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

export type ModelBase = SerializableObject | SerializableArray;

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

// export type ModelCfgs = readonly ModelCfg<unknown>[];
export type ModelCfgs = {
  [modelId: string]: ModelCfg<ModelBase>;
};

export interface FullData<F> {
  data: F;
}

export interface BaseCfg {
  dbAdapter?: DatabaseAdapter;
  onDbError?: (err: any) => void;
  pollInterval?: number;
  isEncryptData?: boolean;
  encryptKey?: string;
  isCreateBackups?: boolean;
  crossModelVersion?: number;
  crossModelMigrations?: {
    [version: string]: (arg: FullData<unknown>) => FullData<unknown>;
  };
  validate?: (data: any) => boolean;
  // TODO type
  repair?: (data: any) => any;

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

export interface RemoteMeta {
  lastUpdate?: number;
  revMap: RevMap;
  crossModelVersion: number;
  modelVersions: ModelVersionMap;
}

export interface LocalMeta extends RemoteMeta {
  lastSyncedUpdate?: number;
  metaRev?: string;
}

export interface ConflictData {
  reason: ConflictReason;
  remote: RemoteMeta;
  local: LocalMeta;
  additional?: unknown;
}

export interface CompleteBackup {
  timestamp: number;
  data: { [modelGroupId: string]: any };
}

export type ExtractModelCfgType<T extends ModelCfg<ModelBase>> =
  T extends ModelCfg<infer U> ? U : never;

export type ModelCfgToModelCtrl<T extends ModelCfgs> = {
  [K in keyof T]: ModelCtrl<ExtractModelCfgType<T[K]>>;
};

export type CompleteModel<T extends ModelCfgs> = {
  [K in keyof T]: ExtractModelCfgType<T[K]>;
};
