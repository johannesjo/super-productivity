import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskRepeatCfg, TaskRepeatCfgState } from '../task-repeat-cfg.model';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { isSameDay } from '../../../util/is-same-day';
import { getNewestPossibleDueDate } from './get-newest-possible-due-date.util';

export const adapter: EntityAdapter<TaskRepeatCfg> = createEntityAdapter<TaskRepeatCfg>();
export const TASK_REPEAT_CFG_FEATURE_NAME = 'taskRepeatCfg';
const { selectAll } = adapter.getSelectors();
export const selectTaskRepeatCfgFeatureState = createFeatureSelector<TaskRepeatCfgState>(
  TASK_REPEAT_CFG_FEATURE_NAME,
);
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
