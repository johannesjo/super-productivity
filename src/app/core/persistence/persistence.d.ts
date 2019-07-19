import {AppBaseData, AppDataForProjects} from '../../imex/sync/sync.model';

export type ProjectDataLsKey
  = 'CFG'
  | 'TASKS_STATE'
  | 'TASK_REPEAT_CFG_STATE'
  | 'TASK_ATTACHMENT_STATE'
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

  load(): Promise<T>;

  save(state: T, isForce?: boolean): Promise<any>;
}

export interface EntityModelHelpers<S, M> {
  getById(projectId: string, id: string): Promise<M>;

  // NOTE: side effects are not executed!!!
  updateById(projectId: string, id: string, changes: Partial<M>): Promise<M>;

  // NOTE: not all id instances might be considered (e.g. todaysTaskIds for task state)
  // NOTE: side effects are not executed!!!
  removeById(projectId: string, id: string): Promise<any>;

  // NOTE: side effects are not executed!!!
  bulkUpdate(projectId: string, adjustFn: (model: M) => M): Promise<S>;
}

export interface PersistenceForProjectModel<S, M> {
  appDataKey: keyof AppDataForProjects;

  ent: EntityModelHelpers<S, M>;

  load(projectId: string): Promise<S>;

  save(projectId: string, state: S, isForce?: boolean): Promise<any>;

  remove(projectId: string): Promise<any>;
}
