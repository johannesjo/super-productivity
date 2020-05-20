import {AppBaseData, AppDataForProjects} from '../../imex/sync/sync.model';
import {Action} from '@ngrx/store';

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

  saveState(state: T, isForce?: boolean): Promise<any>;
}

export interface PersistenceBaseEntityModel<S, M> extends PersistenceBaseModel<S> {
  getById(id: string): Promise<M>;

  // @deprecated TODO can be removed
  getByIds(id: string[]): Promise<M[]>;

  // NOTE: side effects are not executed!!!
  // @deprecated TODO can be removed
  bulkUpdate(adjustFn: (model: M) => M): Promise<S>;

  // NOTE: side effects are not executed!!!
  execAction(action: Action): Promise<S>;
}

export interface EntityModelHelpers<S, M> {
  getById(projectId: string, id: string): Promise<M>;

  // @deprecated TODO can be removed
  getByIds(projectId: string, id: string[]): Promise<M[]>;

  // NOTE: side effects are not executed!!!
  // @deprecated TODO can be removed
  bulkUpdate(projectId: string, adjustFn: (model: M) => M): Promise<S>;

  // NOTE: side effects are not executed!!!
  // @deprecated TODO can be removed
  execAction(projectId: string, action: Action): Promise<S>;
}

export interface EntityModelHelpersForAllProjects<S, M> {
  // NOTE: side effects are not executed!!!
  // @deprecated TODO can be removed
  bulkUpdate(adjustFn: (model: M) => M): Promise<any>;
}

export interface PersistenceForProjectModel<S, M> {
  appDataKey: keyof AppDataForProjects;

  ent: EntityModelHelpers<S, M>;

  // @deprecated TODO can be removed
  entAllProjects: EntityModelHelpersForAllProjects<S, M>;

  load(projectId: string): Promise<S>;

  save(projectId: string, state: S, isForce?: boolean): Promise<any>;

  // NOTE: side effects are not executed!!!
  // @deprecated TODO can be removed
  update(projectId: string, adjustFn: (state: S) => S): Promise<S>;

  // @deprecated TODO can be removed
  remove(projectId: string): Promise<any>;
}
