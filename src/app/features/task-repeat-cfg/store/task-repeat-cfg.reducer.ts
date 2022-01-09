import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  addTaskRepeatCfgToTask,
  deleteTaskRepeatCfg,
  deleteTaskRepeatCfgs,
  updateTaskRepeatCfg,
  updateTaskRepeatCfgs,
  upsertTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import {
  TASK_REPEAT_WEEKDAY_MAP,
  TaskRepeatCfg,
  TaskRepeatCfgState,
} from '../task-repeat-cfg.model';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { migrateTaskRepeatCfgState } from '../migrate-task-repeat-cfg-state.util';
import { isSameDay } from '../../../util/is-same-day';
import { MODEL_VERSION_KEY } from '../../../app.constants';
import { MODEL_VERSION } from '../../../core/model-version';

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
    const todayDay = new Date(dayDate).getDay();
    const todayDayStr: keyof TaskRepeatCfg = TASK_REPEAT_WEEKDAY_MAP[todayDay];
    return (
      taskRepeatCfgs &&
      taskRepeatCfgs.filter((taskRepeatCfg: TaskRepeatCfg) => {
        switch (taskRepeatCfg.repeatCycle) {
          case 'DAILY': {
            return (
              !isSameDay(taskRepeatCfg.lastTaskCreation, dayDate) &&
              // also check for if future instance was already created via the work-view button
              dayDate >= taskRepeatCfg.lastTaskCreation
            );
          }
          case 'WEEKLY':
          default: {
            return (
              taskRepeatCfg[todayDayStr] &&
              !isSameDay(taskRepeatCfg.lastTaskCreation, dayDate) &&
              // also check for if future instance was already created via the work-view button
              dayDate >= taskRepeatCfg.lastTaskCreation
            );
          }
        }
      })
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
  [MODEL_VERSION_KEY]: MODEL_VERSION.TASK_REPEAT,
});

export const taskRepeatCfgReducer = createReducer<TaskRepeatCfgState>(
  initialTaskRepeatCfgState,

  on(loadAllData, (oldState, { appDataComplete }) =>
    appDataComplete.taskRepeatCfg
      ? migrateTaskRepeatCfgState({ ...appDataComplete.taskRepeatCfg })
      : oldState,
  ),

  on(addTaskRepeatCfgToTask, (state, { taskRepeatCfg }) =>
    adapter.addOne(taskRepeatCfg, state),
  ),
  on(updateTaskRepeatCfg, (state, { taskRepeatCfg }) =>
    adapter.updateOne(taskRepeatCfg, state),
  ),
  on(upsertTaskRepeatCfg, (state, { taskRepeatCfg }) =>
    adapter.upsertOne(taskRepeatCfg, state),
  ),
  on(deleteTaskRepeatCfg, (state, { id }) => adapter.removeOne(id, state)),
  on(deleteTaskRepeatCfgs, (state, { ids }) => adapter.removeMany(ids, state)),
  on(updateTaskRepeatCfgs, (state, { ids, changes }) =>
    adapter.updateMany(
      ids.map((id) => ({
        id,
        changes,
      })),
      state,
    ),
  ),
  on(deleteTaskRepeatCfg, (state, { id }) => adapter.removeOne(id, state)),
);
