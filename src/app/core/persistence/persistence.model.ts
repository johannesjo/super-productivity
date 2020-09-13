import { AppBaseData, AppDataForProjects } from '../../imex/sync/sync.model';
import { Action } from '@ngrx/store';

export type ProjectDataLsKey
  = 'CFG'
  // | 'TASKS_STATE'
  // | 'TASK_REPEAT_CFG_STATE'
  // | 'TASK_ATTACHMENT_STATE'
  // | 'TASKS_ARCHIVE'
  // | 'TAG_STATE'
  | 'ISSUE_STATE'
  | 'NOTE_STATE'
  | 'BOOKMARK_STATE'
  | 'METRIC_STATE'
  | 'IMPROVEMENT_STATE'
  | 'OBSTRUCTION_STATE'
  ;

export interface PersistenceBaseModel<T> {
  appDataKey: keyof AppBaseData;

  loadState(isSkipMigration?: boolean): Promise<T>;

  saveState(state: T, flags: { isDataImport?: boolean, isSyncModelChange?: boolean }): Promise<unknown>;
}

export interface PersistenceBaseEntityModel<S, M> extends PersistenceBaseModel<S> {
  getById(id: string): Promise<M>;

  // NOTE: side effects are not executed!!!
  execAction(action: Action): Promise<S>;
}

export interface EntityModelHelpers<S, M> {
  getById(projectId: string, id: string): Promise<M>;
}

export interface PersistenceForProjectModel<S, M> {
  appDataKey: keyof AppDataForProjects;

  ent: EntityModelHelpers<S, M>;

  load(projectId: string): Promise<S>;

  save(projectId: string, state: S, flags: { isDataImport?: boolean, isSyncModelChange?: boolean }): Promise<unknown>;

  /* @deprecated */
  remove(projectId: string): Promise<unknown>;
}
