import { AppBaseData, AppDataForProjects } from '../../imex/sync/sync.model';
import { Action } from '@ngrx/store';
import { ActionReducer } from '@ngrx/store/src/models';

export interface PersistenceBaseModel<T> {
  appDataKey: keyof AppBaseData;

  loadState(isSkipMigration?: boolean): Promise<T>;

  saveState(
    state: T,
    flags: { isDataImport?: boolean; isSyncModelChange?: boolean },
  ): Promise<unknown>;
}

export interface PersistenceBaseEntityModel<S, M> extends PersistenceBaseModel<S> {
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

export interface PersistenceForProjectModel<S, M> {
  appDataKey: keyof AppDataForProjects;

  ent: EntityModelHelpers<S, M>;

  load(projectId: string): Promise<S>;

  save(
    projectId: string,
    state: S,
    flags: { isDataImport?: boolean; isSyncModelChange?: boolean },
  ): Promise<unknown>;

  /* @deprecated */
  remove(projectId: string): Promise<unknown>;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PersistenceProjectModelCfg<S, M> {
  appDataKey: keyof AppDataForProjects;
  // modelVersion: number;
  // migrateFn?: (state: S, projectId: string) => S;
}
