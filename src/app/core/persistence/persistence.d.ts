import {AppBaseData, AppDataForProjects} from '../../imex/sync/sync.model';

export type ProjectDataLsKey
  = 'CFG'
  | 'TASKS_STATE'
  | 'TASK_ATTACHMENT_STATE'
  | 'TASKS_ARCHIVE'
  | 'ISSUE_STATE'
  | 'NOTE_STATE'
  | 'BOOKMARK_STATE'
  ;


export interface PersistenceModelConfig {
  lsKey: string;
  appDataKey: keyof AppDataForProjects;
}

export interface PersistenceBaseModel<T> {
  appDataKey: keyof AppBaseData;

  load(): Promise<T>;

  save(state: T, isForce?: boolean): Promise<any>;
}

export interface PersistenceForProjectModel<T> {
  appDataKey: keyof AppDataForProjects;

  load(projectId: string): Promise<T>;

  save(projectId: string, state: T, isForce?: boolean): Promise<any>;

  remove(projectId: string): Promise<any>;
}
