import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorkContext, WorkContextState, WorkContextType } from '../work-context.model';
import { selectTagById, selectTagFeatureState } from '../../tag/store/tag.reducer';
import {
  mapSubTasksToTask,
  selectTaskEntities,
  selectTaskFeatureState,
} from '../../tasks/store/task.selectors';
import { Task, TaskPlanned, TaskWithSubTasks } from '../../tasks/task.model';
import { devError } from '../../../util/dev-error';
import {
  projectSelectors,
  selectProjectById,
} from '../../project/store/project.selectors';
import { selectNoteTodayOrder } from '../../note/store/note.reducer';
import { TODAY_TAG } from '../../tag/tag.const';

export const WORK_CONTEXT_FEATURE_NAME = 'workContext';

export const selectContextFeatureState = createFeatureSelector<WorkContextState>(
  WORK_CONTEXT_FEATURE_NAME,
);
export const selectActiveContextId = createSelector(
  selectContextFeatureState,
  (state) => state.activeId,
);
export const selectActiveContextType = createSelector(
  selectContextFeatureState,
  (state) => state.activeType,
);
export const selectActiveContextTypeAndId = createSelector(
  selectContextFeatureState,
  (
    state: WorkContextState,
  ): {
    activeId: string;
    activeType: WorkContextType;
    // additional entities state properties
  } => ({
    activeType: state.activeType as WorkContextType,
    activeId: state.activeId as string,
  }),
);

export const selectActiveWorkContext = createSelector(
  selectActiveContextTypeAndId,
  projectSelectors,
  selectTagFeatureState,
  selectNoteTodayOrder,
  ({ activeId, activeType }, projectState, tagState, todayOrder): WorkContext => {
    if (activeType === WorkContextType.TAG) {
      const tag = selectTagById.projector(tagState, { id: activeId });
      return {
        ...tag,
        type: WorkContextType.TAG,
        routerLink: `tag/${tag.id}`,
        noteIds: todayOrder,
      };
    }
    if (activeType === WorkContextType.PROJECT) {
      const project = selectProjectById.projector(projectState, { id: activeId });
      return {
        ...project,
        icon: null,
        taskIds: project.taskIds || [],
        isEnableBacklog: project.isEnableBacklog,
        backlogTaskIds: project.backlogTaskIds || [],
        type: WorkContextType.PROJECT,
        routerLink: `project/${project.id}`,
      };
    }
    throw new Error(
      'Unable to select active work context: ' + activeType + ' ' + activeId,
    );
  },
);

export const selectTrackableTasksForActiveContext = createSelector(
  selectActiveWorkContext,
  selectTaskEntities,
  (activeContext, entities): Task[] => {
    let trackableTasks: Task[] = [];
    activeContext.taskIds.forEach((id) => {
      const task: Task | undefined = entities[id];
      if (!task) {
        // NOTE: there is the rare chance that activeWorkContext$ and selectTaskEntities
        // are out of sync, due to activeWorkContext taking an extra step, this is why we
        // only use devError
        devError('Task not found');
      } else if (task.subTaskIds && task.subTaskIds.length) {
        trackableTasks = trackableTasks.concat(
          task.subTaskIds.map((sid) => entities[sid] as Task),
        );
      } else {
        trackableTasks.push(task);
      }
    });
    return trackableTasks;
  },
);

export const selectStartableTasksForActiveContext = createSelector(
  selectTrackableTasksForActiveContext,
  (trackableTasks): Task[] => {
    return trackableTasks.filter((task) => !task.isDone);
  },
);

export const selectTrackableTasksActiveContextFirst = createSelector(
  selectTaskFeatureState,
  selectStartableTasksForActiveContext,
  (s, forActiveContext): Task[] => {
    const activeContextIds = forActiveContext.map((item) => item.id);
    const otherTasks = s.ids
      .map((id) => s.entities[id] as Task)
      .filter(
        (task) =>
          (!!task.parentId || task.subTaskIds.length === 0) &&
          !activeContextIds.includes(task.id),
      );
    return [...forActiveContext, ...otherTasks];
  },
);

export const selectStartableTasksActiveContextFirst = createSelector(
  selectTrackableTasksActiveContextFirst,
  (trackableTasks): Task[] => {
    return trackableTasks.filter((task) => !task.isDone);
  },
);

export const selectDoneTaskIdsForActiveContext = createSelector(
  selectActiveWorkContext,
  selectTaskEntities,
  (activeContext, entities): string[] => {
    return activeContext.taskIds.filter((id: string) => {
      const task: Task | undefined = entities[id];
      if (!task) {
        // NOTE: there is the rare chance that activeWorkContext$ and selectTaskEntities
        // are out of sync, due to activeWorkContext taking an extra step, this is why we
        // only use devError
        devError('Task not found');
      }
      return !task?.isDone;
    });
  },
);

export const selectDoneBacklogTaskIdsForActiveContext = createSelector(
  selectActiveWorkContext,
  selectTaskEntities,
  (activeContext, entities): string[] | undefined => {
    return activeContext.backlogTaskIds?.filter((id: string) => {
      const task: Task | undefined = entities[id];
      if (!task) {
        // NOTE: there is the rare chance that activeWorkContext$ and selectTaskEntities
        // are out of sync, due to activeWorkContext taking an extra step, this is why we
        // only use devError
        devError('Task not found');
      }
      return !task?.isDone;
    });
  },
);

export const selectTodayTaskIds = createSelector(
  selectTagFeatureState,
  (tagState): string[] => {
    return tagState.entities[TODAY_TAG.id]?.taskIds || [];
  },
);

export const selectTimelineTasks = createSelector(
  selectTodayTaskIds,
  selectTaskFeatureState,
  (
    todayIds,
    s,
  ): {
    planned: TaskPlanned[];
    unPlanned: TaskWithSubTasks[];
  } => {
    const allPlannedTasks: TaskPlanned[] = [];
    s.ids
      .map((id) => s.entities[id] as Task)
      .forEach((t) => {
        if (!t.isDone) {
          // if (
          //   !!t.parentId &&
          //   (s.entities[t.parentId] as Task).plannedAt &&
          //   (s.entities[t.parentId] as Task).reminderId
          // ) {
          //   allPlannedTasks.push({
          //     ...t,
          //     plannedAt:
          //       t.plannedAt ||
          //       ((s.entities[t.parentId as string] as Task).plannedAt as number),
          //   });
          // } else
          if (t.plannedAt && t.reminderId) {
            allPlannedTasks.push(t as TaskPlanned);
          }
        }
      });
    const allPlannedIds = allPlannedTasks.map((t) => t.id);

    return {
      planned: allPlannedTasks,
      unPlanned: todayIds
        .map((id) => {
          return mapSubTasksToTask(s.entities[id] as Task, s) as TaskWithSubTasks;
        })
        .filter((t) => !t.isDone && !allPlannedIds.includes(t.id)),
    };
  },
);

export const selectTodayTasksWithPlannedAndDoneSeperated = createSelector(
  selectTagFeatureState,
  selectTaskFeatureState,
  (
    tagState,
    taskState,
  ): {
    planned: TaskPlanned[];
    normal: Task[];
    done: Task[];
  } => {
    const taskIds = tagState.entities[TODAY_TAG.id]?.taskIds || [];
    const normalTasks: Task[] = [];
    const allPlannedTasks: TaskPlanned[] = [];
    const doneTasks: Task[] = [];
    taskIds
      .map((id) => taskState.entities[id] as Task)
      .forEach((t) => {
        if (t.plannedAt && t.reminderId) {
          allPlannedTasks.push(t as TaskPlanned);
        } else if (t.isDone) {
          doneTasks.push(t);
        } else {
          normalTasks.push(t);
        }
      });

    return {
      planned: allPlannedTasks,
      normal: normalTasks,
      done: doneTasks,
    };
  },
);
