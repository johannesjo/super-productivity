import { AppBaseData } from '../../imex/sync/sync.model';
import { Action } from '@ngrx/store';
import { ActionReducer } from '@ngrx/store/src/models';

export interface PersistenceLegacyBaseModel<T> {
  appDataKey: keyof AppBaseData;

  loadState(isSkipMigration?: boolean): Promise<T>;

  saveState(
    state: T,
    flags: { isDataImport?: boolean; isSyncModelChange?: boolean },
  ): Promise<unknown>;
}

export interface PersistenceBaseEntityModel<S, M> extends PersistenceLegacyBaseModel<S> {
  getById(id: string): Promise<M>;

  // NOTE: side effects are not executed!!!
  execAction(action: Action, isSyncModelChange?: boolean): Promise<S>;

  // NOTE: side effects are not executed!!!
  execActions(actions: Action[], isSyncModelChange?: boolean): Promise<S>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface EntityModelHelpers<S, M> {
  getById(projectId: string, id: string): Promise<M>;
}

export interface PersistenceBaseModelCfg<S> {
  appDataKey: keyof AppBaseData;
  modelVersion: number;
  migrateFn: (state: S) => S;
  isSkipPush?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PersistenceEntityModelCfg<S, M> {
  appDataKey: keyof AppBaseData;
  modelVersion: number;
  reducerFn: ActionReducer<S, { type: string; payload?: any }>;
  migrateFn: (state: S) => S;
}
