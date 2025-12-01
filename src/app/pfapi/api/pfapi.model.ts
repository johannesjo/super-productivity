import { DatabaseAdapter } from './db/database-adapter.model';
import { ModelCtrl } from './model-ctrl/model-ctrl';
import { ConflictReason, SyncProviderId, SyncStatus } from './pfapi.const';
import { DropboxPrivateCfg } from './sync/providers/dropbox/dropbox';
import { IValidation } from 'typia';
import { WebdavPrivateCfg } from './sync/providers/webdav/webdav.model';

type JSONPrimitive = string | number | boolean | null;
type Serializable = JSONPrimitive | SerializableObject | SerializableArray;

interface SerializableObject {
  // TODO fix serializable check
  // [key: string]: Serializable;
  [key: string]: any;
}

export type ValidationResult<T> = IValidation<T>;

type SerializableArray = Array<Serializable>;

export type ModelBase = SerializableObject | SerializableArray | unknown;

export interface ModelCfg<T extends ModelBase> {
  // modelVersion: number;
  isLocalOnly?: boolean;
  isAlwaysReApplyOldMigrations?: boolean;
  debounceDbWrite?: number;
  isMainFileModel?: boolean;

  validate?: <R>(data: R | T) => IValidation<R | T>;
  repair?: <R>(data: R | unknown | any) => T;

  // MAYBE?
  // transformBeforeSave?: <I>(data: I) => T;
  // transformBeforeLoad?: <I>(data: T) => I;
  // transformBeforeUpload?: <I>(data: I) => T;
  // transformBeforeDownload?: <I>(data: I) => T;

  defaultData?: T;
}

// export type ModelCfgs = readonly ModelCfg<unknown>[];
export type ModelCfgs = {
  [modelId: string]: ModelCfg<ModelBase>;
};

// TODO better type
// maybe Partial<AllModelData>
export interface MainModelData {
  [modelId: string]: ModelBase;
}

export type CrossModelMigrateFn = <R, F>(fullData: F) => R;

export interface CrossModelMigrations {
  [version: number]: CrossModelMigrateFn;
}

export type CrossModelBackwardsMigrateFn = <R, F>(fullData: F) => R;

export interface CrossModelBackwardsMigrations {
  [version: number]: CrossModelBackwardsMigrateFn;
}

export interface PfapiBaseCfg<T extends ModelCfgs> {
  dbAdapter?: DatabaseAdapter;
  onDbError?: (err: any) => void;
  pollInterval?: number;
  // TODO needs to be dynamically settable
  isEncryptData?: boolean;
  encryptKey?: string;
  isCreateBackups?: boolean;
  crossModelVersion?: number;
  crossModelMigrations?: CrossModelMigrations;
  crossModelBackwardMigrations?: CrossModelBackwardsMigrations;
  validate?: (data: AllModelData<T>) => IValidation<AllModelData<T>>;
  repair?: <R>(data: R | unknown, errors: IValidation.IError[]) => AllModelData<T>;

  // TODO
  // backupInterval?: 'daily';
  // isUseLockFile?: boolean;BaseCfg
  // translateFN: (key)=> translate(key),
}

export interface RevMap {
  [modelOrFileGroupId: string]: string;
}

export interface MetaFileBase {
  lastUpdate: number;
  lastUpdateAction?: string;
  revMap: RevMap;
  crossModelVersion: number;
  lastSyncedAction?: string;
  // Vector clock fields for improved conflict detection
  vectorClock?: VectorClock;
  lastSyncedVectorClock?: VectorClock | null;
}

export interface VectorClock {
  [clientId: string]: number;
}

export interface RemoteMeta extends MetaFileBase {
  mainModelData: MainModelData;
  isFullData?: boolean;
}

export interface UploadMeta extends Omit<RemoteMeta, 'lastSyncedVectorClock'> {
  // Vector clock should not be synced, only used locally
  lastSyncedVectorClock?: null;
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

export interface SyncProviderPrivateCfgBase {
  encryptKey?: string;
}

// Local file sync config that works for both platforms
export interface LocalFileSyncPrivateCfg extends SyncProviderPrivateCfgBase {
  // Electron specific
  syncFolderPath?: string;
  // Android SAF specific
  safFolderUri?: string;
}

// TODO better dynamic typing
export type SyncProviderPrivateCfg =
  | DropboxPrivateCfg
  | WebdavPrivateCfg
  | LocalFileSyncPrivateCfg;

export type PrivateCfgByProviderId<T extends SyncProviderId> =
  T extends SyncProviderId.LocalFile
    ? LocalFileSyncPrivateCfg
    : T extends SyncProviderId.WebDAV
      ? WebdavPrivateCfg
      : T extends SyncProviderId.Dropbox
        ? DropboxPrivateCfg
        : never;

// Define all possible event names
export type PfapiEvents =
  | 'syncDone'
  | 'syncStart'
  | 'syncError'
  | 'syncStatusChange'
  | 'metaModelChange'
  | 'providerChange'
  | 'providerPrivateCfgChange'
  | 'providerReady'
  | 'onBeforeUpdateLocal';

export type SyncStatusChangePayload =
  | 'UNKNOWN_OR_CHANGED'
  | 'ERROR'
  | 'IN_SYNC'
  | 'SYNCING';

// Map each event name to its payload type
export interface PfapiEventPayloadMap {
  syncDone: { status: SyncStatus; conflictData?: ConflictData } | unknown;
  syncStart: undefined;
  syncError: unknown;
  syncStatusChange: SyncStatusChangePayload;
  metaModelChange: LocalMeta;
  providerChange: { id: string };
  providerReady: boolean;
  // TODO better dynamic typing
  providerPrivateCfgChange: {
    providerId: string;
    privateCfg: SyncProviderPrivateCfg;
  };
  onBeforeUpdateLocal: {
    backup: CompleteBackup<any>;
    modelsToUpdate?: string[];
  };
}

export interface EncryptAndCompressCfg {
  isEncrypt: boolean;
  isCompress: boolean;
}
