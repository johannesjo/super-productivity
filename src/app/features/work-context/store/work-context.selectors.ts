import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorkContext, WorkContextState, WorkContextType } from '../work-context.model';
import {
  computeOrderedTaskIdsForTag,
  selectTagById,
  selectTagFeatureState,
} from '../../tag/store/tag.reducer';
import {
  mapSubTasksToTask,
  selectTaskEntities,
  selectTaskFeatureState,
} from '../../tasks/store/task.selectors';
import { Task, TaskWithDueTime, TaskWithSubTasks } from '../../tasks/task.model';
import { devError } from '../../../util/dev-error';
import { selectProjectFeatureState } from '../../project/store/project.selectors';
import { selectNoteTodayOrder } from '../../note/store/note.reducer';
import { TODAY_TAG } from '../../tag/tag.const';
import { Log } from '../../../core/log';

export const WORK_CONTEXT_FEATURE_NAME = 'workContext';

export const selectContextFeatureState = createFeatureSelector<WorkContextState>(
  WORK_CONTEXT_FEATURE_NAME,
);
export const selectActiveContextId = createSelector(
  selectContextFeatureState,
  (state) => state.activeId,
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
  selectProjectFeatureState,
  selectTagFeatureState,
  selectTaskFeatureState,
  selectNoteTodayOrder,
  (
    { activeId, activeType },
    projectState,
    tagState,
    taskState,
    todayOrder,
  ): WorkContext => {
    if (activeType === WorkContextType.TAG) {
      const tag = selectTagById.projector(tagState, { id: activeId });
      // Use board-style pattern: task.tagIds is source of truth for membership,
      // tag.taskIds is only for ordering. This provides atomic consistency and self-healing.
      const orderedTaskIds = computeOrderedTaskIdsForTag(
        activeId,
        tag,
        taskState.entities,
      );
      return {
        ...tag,
        taskIds: orderedTaskIds,
        type: WorkContextType.TAG,
        routerLink: `tag/${tag.id}`,
        noteIds: todayOrder,
      };
    }
    if (activeType === WorkContextType.PROJECT) {
      const project = projectState.entities[activeId];
      if (!project) {
        // This should not happen, but if it does, we don't want to crash the app
        // This might happen during import when the active context is set to a project that is not yet imported
        Log.err('Project not found: ' + activeId);
        const tag = tagState.entities[TODAY_TAG.id];
        if (!tag) {
          throw new Error('Today tag not found');
        }
        // Fallback to TODAY tag with board-style pattern
        const orderedTaskIds = computeOrderedTaskIdsForTag(
          TODAY_TAG.id,
          tag,
          taskState.entities,
        );
        return {
          ...tag,
          taskIds: orderedTaskIds,
          type: WorkContextType.TAG,
          routerLink: `tag/${tag.id}`,
          noteIds: todayOrder,
        };
      }
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

const sortDoneLast = (a: Task, b: Task): number => {
  if (a.isDone && !b.isDone) {
    return 1;
  }
  if (!a.isDone && b.isDone) {
    return -1;
  }
  return 0;
};

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
    return trackableTasks.sort(sortDoneLast);
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
    return [...forActiveContext, ...otherTasks].sort(sortDoneLast);
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
  selectTaskFeatureState,
  (tagState, taskState): string[] => {
    // Use board-style pattern: task.tagIds is source of truth for membership
    const todayTag = tagState.entities[TODAY_TAG.id];
    return computeOrderedTaskIdsForTag(TODAY_TAG.id, todayTag, taskState.entities);
  },
);

export const selectUndoneTodayTaskIds = createSelector(
  selectTodayTaskIds,
  selectTaskFeatureState,
  (todayTaskIds, taskState): string[] => {
    // selectTodayTaskIds already uses board-style pattern
    return todayTaskIds.filter((taskId) => taskState.entities[taskId]?.isDone === false);
  },
);

export const selectTimelineTasks = createSelector(
  selectTodayTaskIds,
  selectTaskFeatureState,
  (
    todayIds,
    s,
  ): {
    planned: TaskWithDueTime[];
    unPlanned: TaskWithSubTasks[];
  } => {
    const allPlannedTasks: TaskWithDueTime[] = [];
    s.ids
      .map((id) => s.entities[id] as Task)
      .forEach((t) => {
        if (!t.isDone) {
          if (t.dueWithTime) {
            allPlannedTasks.push(t as TaskWithDueTime);
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
