import {AppBaseData, AppDataForProjects} from '../../imex/sync/sync.model';
import {Action} from '@ngrx/store';

export type ProjectDataLsKey
  = 'CFG'
  | 'TASKS_STATE'
  | 'TASK_REPEAT_CFG_STATE'
  | 'TASK_ATTACHMENT_STATE'
  | 'TAG_STATE'
  | 'TASKS_ARCHIVE'
  | 'ISSUE_STATE'
  | 'NOTE_STATE'
  | 'BOOKMARK_STATE'
  | 'METRIC_STATE'
  | 'IMPROVEMENT_STATE'
  | 'OBSTRUCTION_STATE'
  ;


export interface PersistenceBaseModel<T> {
  appDataKey: keyof AppBaseData;

  loadState(): Promise<T>;

  saveState(state: T, isForce?: boolean): Promise<any>;
}

export interface EntityModelHelpers<S, M> {
  getById(projectId: string, id: string): Promise<M>;

  getByIds(projectId: string, id: string[]): Promise<M[]>;

  // NOTE: side effects are not executed!!!
  bulkUpdate(projectId: string, adjustFn: (model: M) => M): Promise<S>;

  // NOTE: side effects are not executed!!!
  execAction(projectId: string, action: Action): Promise<S>;
}

export interface EntityModelHelpersForAllProjects<S, M> {
  // NOTE: side effects are not executed!!!
  bulkUpdate(adjustFn: (model: M) => M): Promise<any>;
}

export interface PersistenceForProjectModel<S, M> {
  appDataKey: keyof AppDataForProjects;

  ent: EntityModelHelpers<S, M>;

  entAllProjects: EntityModelHelpersForAllProjects<S, M>;

  load(projectId: string): Promise<S>;

  save(projectId: string, state: S, isForce?: boolean): Promise<any>;

  // NOTE: side effects are not executed!!!
  update(projectId: string, adjustFn: (state: S) => S): Promise<S>;

  remove(projectId: string): Promise<any>;
}
