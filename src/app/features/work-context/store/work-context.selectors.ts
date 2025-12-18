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
import { getDbDateStr } from '../../../util/get-db-date-str';
import { Tag } from '../../tag/tag.model';

export const WORK_CONTEXT_FEATURE_NAME = 'workContext';

/**
 * Computes ordered task IDs for TODAY_TAG using dueDay for membership.
 *
 * TODAY_TAG is a "virtual tag" - membership is determined by task.dueDay === today,
 * NOT by task.tagIds. TODAY_TAG.taskIds only stores the ordering.
 *
 * See: docs/ai/today-tag-architecture.md
 */
const computeOrderedTaskIdsForToday = (
  todayTag: Tag | undefined,
  taskEntities: Record<
    string,
    { id: string; dueDay?: string | null; parentId?: string | null } | undefined
  >,
): string[] => {
  const todayStr = getDbDateStr();
  const storedOrder = todayTag?.taskIds || [];

  // Find all tasks where dueDay === today (membership source of truth)
  const tasksForToday: string[] = [];
  for (const taskId of Object.keys(taskEntities)) {
    const task = taskEntities[taskId];
    if (task && !task.parentId && task.dueDay === todayStr) {
      tasksForToday.push(taskId);
    }
  }

  if (tasksForToday.length === 0) {
    return [];
  }

  // Order tasks according to TODAY_TAG.taskIds, with unordered tasks appended
  const tasksForTodaySet = new Set(tasksForToday);
  const orderedTasks: (string | undefined)[] = [];
  const unorderedTasks: string[] = [];

  for (const taskId of tasksForToday) {
    const orderIndex = storedOrder.indexOf(taskId);
    if (orderIndex > -1) {
      orderedTasks[orderIndex] = taskId;
    } else {
      unorderedTasks.push(taskId);
    }
  }

  return [
    ...orderedTasks.filter(
      (id): id is string => id !== undefined && tasksForTodaySet.has(id),
    ),
    ...unorderedTasks,
  ];
};

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

      // TODAY_TAG uses dueDay for membership (virtual tag pattern)
      // Regular tags use task.tagIds for membership (board-style pattern)
      const orderedTaskIds =
        activeId === TODAY_TAG.id
          ? computeOrderedTaskIdsForToday(tag, taskState.entities)
          : computeOrderedTaskIdsForTag(activeId, tag, taskState.entities);

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
        // Fallback to TODAY tag - use dueDay for membership (virtual tag pattern)
        const orderedTaskIds = computeOrderedTaskIdsForToday(tag, taskState.entities);
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

/**
 * Selects ordered task IDs for the TODAY work context.
 *
 * TODAY_TAG is a "virtual tag" - membership is determined by task.dueDay,
 * NOT by task.tagIds (TODAY_TAG should NEVER be in task.tagIds).
 * TODAY_TAG.taskIds only stores the ordering.
 *
 * See: docs/ai/today-tag-architecture.md
 */
export const selectTodayTaskIds = createSelector(
  selectTagFeatureState,
  selectTaskFeatureState,
  (tagState, taskState): string[] => {
    const todayTag = tagState.entities[TODAY_TAG.id];
    return computeOrderedTaskIdsForToday(todayTag, taskState.entities);
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

/**
 * Detects if TODAY_TAG.taskIds is inconsistent with tasks' dueDay values.
 * Returns the repaired taskIds if repair is needed, or null if consistent.
 *
 * This is used by ValidateStateService to repair state after sync, preventing
 * divergence caused by per-entity conflict resolution of multi-entity operations.
 *
 * See: docs/ai/today-tag-architecture.md
 */
export const selectTodayTagRepair = createSelector(
  selectTagFeatureState,
  selectTaskFeatureState,
  (tagState, taskState): { needsRepair: boolean; repairedTaskIds: string[] } | null => {
    const todayTag = tagState.entities[TODAY_TAG.id];
    if (!todayTag) {
      return null;
    }

    const todayStr = getDbDateStr();
    const storedTaskIds = todayTag.taskIds;

    // Find all parent tasks where dueDay === today
    const tasksForTodaySet = new Set<string>();
    for (const id of taskState.ids) {
      const task = taskState.entities[id];
      if (task && !task.parentId && task.dueDay === todayStr) {
        tasksForTodaySet.add(task.id);
      }
    }

    // Check for inconsistencies:
    // 1. storedTaskIds contains IDs where task.dueDay !== today (invalid)
    // 2. tasksForTodaySet contains IDs not in storedTaskIds (missing)
    const invalidInStored = storedTaskIds.filter((id) => !tasksForTodaySet.has(id));
    const missingFromStored = [...tasksForTodaySet].filter(
      (id) => !storedTaskIds.includes(id),
    );

    if (invalidInStored.length === 0 && missingFromStored.length === 0) {
      return null; // No repair needed
    }

    // Repair: keep valid IDs in their original order, append missing IDs
    const repairedTaskIds = [
      ...storedTaskIds.filter((id) => tasksForTodaySet.has(id)),
      ...missingFromStored,
    ];

    return { needsRepair: true, repairedTaskIds };
  },
);
