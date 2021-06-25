import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  AddTaskRepeatCfgToTask,
  DeleteTaskRepeatCfg,
  DeleteTaskRepeatCfgs,
  TaskRepeatCfgActions,
  TaskRepeatCfgActionTypes,
  UpdateTaskRepeatCfg,
  UpdateTaskRepeatCfgs,
  UpsertTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import {
  TASK_REPEAT_WEEKDAY_MAP,
  TaskRepeatCfg,
  TaskRepeatCfgState,
} from '../task-repeat-cfg.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../../../imex/sync/sync.model';
import { migrateTaskRepeatCfgState } from '../migrate-task-repeat-cfg-state.util';
import { isSameDay } from '../../../util/is-same-day';

export const TASK_REPEAT_CFG_FEATURE_NAME = 'taskRepeatCfg';

export const adapter: EntityAdapter<TaskRepeatCfg> = createEntityAdapter<TaskRepeatCfg>();
export const selectTaskRepeatCfgFeatureState = createFeatureSelector<TaskRepeatCfgState>(
  TASK_REPEAT_CFG_FEATURE_NAME,
);
export const { selectIds, selectEntities, selectAll, selectTotal } =
  adapter.getSelectors();
export const selectAllTaskRepeatCfgs = createSelector(
  selectTaskRepeatCfgFeatureState,
  selectAll,
);
export const selectTaskRepeatCfgById = createSelector(
  selectTaskRepeatCfgFeatureState,
  (state: TaskRepeatCfgState, props: { id: string }): TaskRepeatCfg => {
    const cfg = state.entities[props.id];
    if (!cfg) {
      throw new Error('Missing taskRepeatCfg');
    }
    return cfg;
  },
);

export const selectTaskRepeatCfgsWithStartTime = createSelector(
  selectAllTaskRepeatCfgs,
  (taskRepeatCfgs: TaskRepeatCfg[]): TaskRepeatCfg[] => {
    return taskRepeatCfgs.filter((cfg) => !!cfg.startTime);
  },
);

// filter out the configs which have been created today already
// and those which are not scheduled for the current week day
export const selectTaskRepeatCfgsDueOnDay = createSelector(
  selectAllTaskRepeatCfgs,
  (
    taskRepeatCfgs: TaskRepeatCfg[],
    { dayDate }: { dayDate: number },
  ): TaskRepeatCfg[] => {
    const day = new Date(dayDate).getDay();
    const dayStr: keyof TaskRepeatCfg = TASK_REPEAT_WEEKDAY_MAP[day];
    return (
      taskRepeatCfgs &&
      taskRepeatCfgs.filter(
        (taskRepeatCfg: TaskRepeatCfg) =>
          taskRepeatCfg[dayStr] &&
          !isSameDay(taskRepeatCfg.lastTaskCreation, dayDate) &&
          // also check for if future instance was already created via the work-view button
          dayDate >= taskRepeatCfg.lastTaskCreation,
      )
    );
  },
);
export const selectTaskRepeatCfgByIdAllowUndefined = createSelector(
  selectTaskRepeatCfgFeatureState,
  (state: TaskRepeatCfgState, props: { id: string }): TaskRepeatCfg | undefined =>
    state.entities[props.id],
);

export const initialTaskRepeatCfgState: TaskRepeatCfgState = adapter.getInitialState({
  // additional entity state properties
});

export const taskRepeatCfgReducer = (
  state: TaskRepeatCfgState = initialTaskRepeatCfgState,
  action: TaskRepeatCfgActions,
): TaskRepeatCfgState => {
  // TODO fix this hackyness once we use the new syntax everywhere
  if ((action.type as string) === loadAllData.type) {
    const { appDataComplete }: { appDataComplete: AppDataComplete } = action as any;
    return appDataComplete.taskRepeatCfg
      ? migrateTaskRepeatCfgState({ ...appDataComplete.taskRepeatCfg })
      : state;
  }

  switch (action.type) {
    case TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask: {
      return adapter.addOne(
        (action as AddTaskRepeatCfgToTask).payload.taskRepeatCfg,
        state,
      );
    }

    case TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg: {
      return adapter.updateOne(
        (action as UpdateTaskRepeatCfg).payload.taskRepeatCfg,
        state,
      );
    }

    case TaskRepeatCfgActionTypes.UpdateTaskRepeatCfgs: {
      const { ids, changes } = (action as UpdateTaskRepeatCfgs).payload;
      return adapter.updateMany(
        ids.map((id) => ({
          id,
          changes,
        })),
        state,
      );
    }

    case TaskRepeatCfgActionTypes.UpsertTaskRepeatCfg: {
      return adapter.upsertOne(
        (action as UpsertTaskRepeatCfg).payload.taskRepeatCfg,
        state,
      );
    }

    case TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg: {
      return adapter.removeOne((action as DeleteTaskRepeatCfg).payload.id, state);
    }

    case TaskRepeatCfgActionTypes.DeleteTaskRepeatCfgs: {
      return adapter.removeMany((action as DeleteTaskRepeatCfgs).payload.ids, state);
    }

    default: {
      return state;
    }
  }
};
