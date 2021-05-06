import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { TaskRepeatCfg } from '../task-repeat-cfg.model';

export enum TaskRepeatCfgActionTypes {
  'AddTaskRepeatCfgToTask' = '[TaskRepeatCfg][Task] Add TaskRepeatCfg to Task',
  'UpdateTaskRepeatCfg' = '[TaskRepeatCfg] Update TaskRepeatCfg',
  'UpdateTaskRepeatCfgs' = '[TaskRepeatCfg] Update multiple TaskRepeatCfgs',
  'UpsertTaskRepeatCfg' = '[TaskRepeatCfg] Upsert TaskRepeatCfg',
  'DeleteTaskRepeatCfg' = '[TaskRepeatCfg] Delete TaskRepeatCfg',
  'DeleteTaskRepeatCfgs' = '[TaskRepeatCfg] Delete multiple TaskRepeatCfgs',
}

export class AddTaskRepeatCfgToTask implements Action {
  readonly type: string = TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask;

  constructor(public payload: { taskId: string; taskRepeatCfg: TaskRepeatCfg }) {}
}

export class UpdateTaskRepeatCfg implements Action {
  readonly type: string = TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg;

  constructor(public payload: { taskRepeatCfg: Update<TaskRepeatCfg> }) {}
}

export class UpdateTaskRepeatCfgs implements Action {
  readonly type: string = TaskRepeatCfgActionTypes.UpdateTaskRepeatCfgs;

  constructor(public payload: { ids: string[]; changes: Partial<TaskRepeatCfg> }) {}
}

export class UpsertTaskRepeatCfg implements Action {
  readonly type: string = TaskRepeatCfgActionTypes.UpsertTaskRepeatCfg;

  constructor(public payload: { taskRepeatCfg: TaskRepeatCfg }) {}
}

export class DeleteTaskRepeatCfg implements Action {
  readonly type: string = TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg;

  constructor(public payload: { id: string }) {}
}

export class DeleteTaskRepeatCfgs implements Action {
  readonly type: string = TaskRepeatCfgActionTypes.DeleteTaskRepeatCfgs;

  constructor(public payload: { ids: string[] }) {}
}

export type TaskRepeatCfgActions =
  | AddTaskRepeatCfgToTask
  | UpdateTaskRepeatCfg
  | UpdateTaskRepeatCfgs
  | UpsertTaskRepeatCfg
  | DeleteTaskRepeatCfg
  | DeleteTaskRepeatCfgs;
