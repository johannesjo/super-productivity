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

export interface EntityModelHelpers<M> {
  getById(projectId: string, id: string): Promise<M>;

  // updateItemById(projectId: string, id: string, changes: Object): Promise<any>;

  // deleteItemById(projectId: string, id: string): Promise<any>;
}

export interface PersistenceForProjectModel<T, M> {
  appDataKey: keyof AppDataForProjects;

  ent: EntityModelHelpers<M>;

  load(projectId: string): Promise<T>;

  save(projectId: string, state: T, isForce?: boolean): Promise<any>;

  remove(projectId: string): Promise<any>;
}
