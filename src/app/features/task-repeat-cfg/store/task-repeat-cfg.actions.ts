import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { TaskRepeatCfg } from '../task-repeat-cfg.model';

export const addTaskRepeatCfgToTask = createAction(
  '[TaskRepeatCfg][Task] Add TaskRepeatCfg to Task',
  props<{
    taskId: string;
    taskRepeatCfg: TaskRepeatCfg;
    startTime?: string;
    remindAt?: string;
  }>(),
);

export const updateTaskRepeatCfg = createAction(
  '[TaskRepeatCfg] Update TaskRepeatCfg',
  props<{
    taskRepeatCfg: Update<TaskRepeatCfg>;
    isAskToUpdateAllTaskInstances?: boolean;
  }>(),
);

export const updateTaskRepeatCfgs = createAction(
  '[TaskRepeatCfg] Update multiple TaskRepeatCfgs',
  props<{ ids: string[]; changes: Partial<TaskRepeatCfg> }>(),
);

export const upsertTaskRepeatCfg = createAction(
  '[TaskRepeatCfg] Upsert TaskRepeatCfg',
  props<{ taskRepeatCfg: TaskRepeatCfg }>(),
);

export const deleteTaskRepeatCfg = createAction(
  '[TaskRepeatCfg] Delete TaskRepeatCfg',
  props<{ id: string }>(),
);

export const deleteTaskRepeatCfgs = createAction(
  '[TaskRepeatCfg] Delete multiple TaskRepeatCfgs',
  props<{ ids: string[] }>(),
);

export const deleteTaskRepeatCfgInstance = createAction(
  '[TaskRepeatCfg] Delete Single Instance',
  props<{ repeatCfgId: string; dateStr: string }>(),
);
