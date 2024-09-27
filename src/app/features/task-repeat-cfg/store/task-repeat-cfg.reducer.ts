import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  addTaskRepeatCfgToTask,
  deleteTaskRepeatCfg,
  deleteTaskRepeatCfgs,
  updateTaskRepeatCfg,
  updateTaskRepeatCfgs,
  upsertTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import { TaskRepeatCfg, TaskRepeatCfgState } from '../task-repeat-cfg.model';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { migrateTaskRepeatCfgState } from '../migrate-task-repeat-cfg-state.util';
import { isSameDay } from '../../../util/is-same-day';
import { MODEL_VERSION_KEY } from '../../../app.constants';
import { MODEL_VERSION } from '../../../core/model-version';
import { getNewestPossibleDueDate } from './get-newest-possible-due-date.util';
import { deleteProject } from '../../project/store/project.actions';

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

export const selectTaskRepeatCfgsWithAndWithoutStartTime = createSelector(
  selectAllTaskRepeatCfgs,
  (
    taskRepeatCfgs: TaskRepeatCfg[],
  ): {
    withStartTime: TaskRepeatCfg[];
    withoutStartTime: TaskRepeatCfg[];
  } => {
    const withStartTime: TaskRepeatCfg[] = [];
    const withoutStartTime: TaskRepeatCfg[] = [];
    taskRepeatCfgs.forEach((cfg) => {
      if (cfg.startTime) {
        withStartTime.push(cfg);
      } else {
        withoutStartTime.push(cfg);
      }
    });
    return { withStartTime, withoutStartTime };
  },
);

export const selectTaskRepeatCfgsSortedByTitleAndProject = createSelector(
  selectAllTaskRepeatCfgs,
  (taskRepeatCfgs: TaskRepeatCfg[]): TaskRepeatCfg[] => {
    return taskRepeatCfgs.sort((a, b) => {
      if (a.projectId !== b.projectId) {
        if (a.projectId === null) {
          return -1;
        }
        if (b.projectId === null) {
          return 1;
        }
        if (a.projectId < b.projectId) {
          return -1;
        }
        if (a.projectId > b.projectId) {
          return 1;
        }
      }
      return (a.title || '').localeCompare(b.title || '');
    });
  },
);

// filter out the configs which have been created today already
// and those which are not scheduled for the current week day
export const selectTaskRepeatCfgsDueOnDayOnly = createSelector(
  selectAllTaskRepeatCfgs,
  (
    taskRepeatCfgs: TaskRepeatCfg[],
    { dayDate }: { dayDate: number },
  ): TaskRepeatCfg[] => {
    const dateToCheckTimestamp = dayDate;
    const dateToCheckDate = new Date(dateToCheckTimestamp);

    return (
      taskRepeatCfgs &&
      taskRepeatCfgs.filter((taskRepeatCfg: TaskRepeatCfg) => {
        if (
          isSameDay(taskRepeatCfg.lastTaskCreation, dateToCheckTimestamp) ||
          // also check for if future instance was already created via the work-view button
          dateToCheckTimestamp < taskRepeatCfg.lastTaskCreation
        ) {
          return false;
        }

        const rd = getNewestPossibleDueDate(taskRepeatCfg, dateToCheckDate);
        return !!rd && isSameDay(rd, dateToCheckDate);
      })
    );
  },
);

export const selectTaskRepeatCfgsDueOnDayIncludingOverdue = createSelector(
  selectAllTaskRepeatCfgs,
  (
    taskRepeatCfgs: TaskRepeatCfg[],
    { dayDate }: { dayDate: number },
  ): TaskRepeatCfg[] => {
    const dateToCheckTimestamp = dayDate;
    const dateToCheckDate = new Date(dateToCheckTimestamp);

    return (
      taskRepeatCfgs &&
      taskRepeatCfgs.filter((taskRepeatCfg: TaskRepeatCfg) => {
        if (
          isSameDay(taskRepeatCfg.lastTaskCreation, dateToCheckTimestamp) ||
          // also check for if future instance was already created via the work-view button
          dateToCheckTimestamp < taskRepeatCfg.lastTaskCreation
        ) {
          return false;
        }

        const rd = getNewestPossibleDueDate(taskRepeatCfg, dateToCheckDate);
        return !!rd;
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

  // delete all project tasks from tags on project delete
  on(deleteProject, (state, { project, allTaskIds }) => {
    const taskRepeatCfgs = state.ids.map((id) => state.entities[id] as TaskRepeatCfg);
    const allCfgIdsForProject = taskRepeatCfgs.filter(
      (cfg) => cfg.projectId === project.id,
    );
    return adapter.removeMany(
      allCfgIdsForProject.map((repeatCfg) => repeatCfg.id),
      state,
    );

    // const cfgsIdsToRemove: string[] = allCfgIdsForProject
    //   .filter((cfg) => !cfg.tagIds || cfg.tagIds.length === 0)
    //   .map((cfg) => cfg.id as string);
    // if (cfgsIdsToRemove.length > 0) {
    //   // this._taskRepeatCfgService.deleteTaskRepeatCfgsNoTaskCleanup(cfgsIdsToRemove);
    //   return adapter.removeMany(cfgsIdsToRemove, state);
    // }

    // const cfgsToUpdate: string[] = allCfgIdsForProject
    //   .filter((cfg) => cfg.tagIds && cfg.tagIds.length > 0)
    //   .map((taskRepeatCfg) => taskRepeatCfg.id as string);
    // if (cfgsToUpdate.length > 0) {
    //   // this._taskRepeatCfgService.updateTaskRepeatCfgs(cfgsToUpdate, { projectId: null });
    // }
  }),

  // INTERNAL
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
