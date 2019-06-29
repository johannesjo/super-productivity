import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {TaskRepeatCfg, TaskRepeatCfgState} from '../task-repeat-cfg.model';

export enum TaskRepeatCfgActionTypes {
    LoadTaskRepeatCfgState = '[TaskRepeatCfg] Load TaskRepeatCfg State',
    AddTaskRepeatCfg = '[TaskRepeatCfg] Add TaskRepeatCfg',
    UpdateTaskRepeatCfg = '[TaskRepeatCfg] Update TaskRepeatCfg',
    UpsertTaskRepeatCfg = '[TaskRepeatCfg] Upsert TaskRepeatCfg',
    DeleteTaskRepeatCfg = '[TaskRepeatCfg] Delete TaskRepeatCfg',
    DeleteTaskRepeatCfgs = '[TaskRepeatCfg] Delete multiple TaskRepeatCfgs',
}

export class LoadTaskRepeatCfgState implements Action {
    readonly type = TaskRepeatCfgActionTypes.LoadTaskRepeatCfgState;

    constructor(public payload: { state: TaskRepeatCfgState }) {
    }
}

export class AddTaskRepeatCfg implements Action {
    readonly type = TaskRepeatCfgActionTypes.AddTaskRepeatCfg;

    constructor(public payload: { taskRepeatCfg: TaskRepeatCfg }) {
    }
}

export class UpdateTaskRepeatCfg implements Action {
    readonly type = TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg;

    constructor(public payload: { taskRepeatCfg: Update<TaskRepeatCfg> }) {
    }
}

export class UpsertTaskRepeatCfg implements Action {
  readonly type = TaskRepeatCfgActionTypes.UpsertTaskRepeatCfg;

  constructor(public payload: {  taskRepeatCfg: TaskRepeatCfg }) {
  }
}

export class DeleteTaskRepeatCfg implements Action {
    readonly type = TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg;

    constructor(public payload: { id: string }) {
    }
}

export class DeleteTaskRepeatCfgs implements Action {
    readonly type = TaskRepeatCfgActionTypes.DeleteTaskRepeatCfgs;

    constructor(public payload: { ids: string[] }) {
    }
}


export type TaskRepeatCfgActions =
    LoadTaskRepeatCfgState
    | AddTaskRepeatCfg
    | UpdateTaskRepeatCfg
    | UpsertTaskRepeatCfg
    | DeleteTaskRepeatCfg
    | DeleteTaskRepeatCfgs
    ;
