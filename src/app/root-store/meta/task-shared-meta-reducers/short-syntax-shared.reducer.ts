import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { RootState } from '../../root-state';
import { TaskSharedActions } from '../task-shared.actions';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import {
  TASK_FEATURE_NAME,
  taskAdapter,
} from '../../../features/tasks/store/task.reducer';
import { Task } from '../../../features/tasks/task.model';
import { TODAY_TAG } from '../../../features/tag/tag.const';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { unique } from '../../../util/unique';
import { isToday } from '../../../util/is-today.util';
import { plannerFeatureKey } from '../../../features/planner/store/planner.reducer';
import {
  ActionHandlerMap,
  getProject,
  getProjectOrUndefined,
  getTag,
  removeTasksFromList,
  updateProject,
  updateTags,
} from './task-shared-helpers';
import { filterOutId } from '../../../util/filter-out-id';

// Type for mutable task changes within the reducer
type MutableTaskChanges = { -readonly [K in keyof Task]?: Task[K] };

interface SchedulingResult {
  state: RootState;
  additionalChanges: MutableTaskChanges;
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

/**
 * Handles the applyShortSyntax action atomically.
 *
 * This combines multiple operations that were previously dispatched separately:
 * 1. Task field updates (title, timeEstimate, etc.)
 * 2. Project move (if targetProjectId specified)
 * 3. Scheduling (planTaskForDay or scheduleTaskWithTime based on schedulingInfo)
 * 4. Tag associations (via taskChanges.tagIds)
 *
 * By handling these atomically in a meta-reducer, we ensure:
 * - State consistency during sync
 * - Single operation in the operation log
 * - No intermediate inconsistent states
 */
const handleApplyShortSyntax = (
  state: RootState,
  task: Task,
  taskChanges: Partial<Task>,
  targetProjectId?: string,
  schedulingInfo?: {
    day?: string;
    isAddToTop?: boolean;
    dueWithTime?: number;
    remindAt?: number | null;
    isMoveToBacklog?: boolean;
  },
): RootState => {
  let updatedState = state;
  const currentTask = state[TASK_FEATURE_NAME].entities[task.id] as Task;

  if (!currentTask) {
    return state;
  }

  // Collect all task changes (start with provided changes)
  const finalTaskChanges: MutableTaskChanges = { ...taskChanges };

  // Step 1: Handle project move if requested
  if (targetProjectId && targetProjectId !== currentTask.projectId) {
    updatedState = moveTaskToProject(
      updatedState,
      task,
      currentTask.projectId,
      targetProjectId,
    );
    finalTaskChanges.projectId = targetProjectId;
  }

  // Step 2: Handle scheduling
  if (schedulingInfo) {
    if (schedulingInfo.dueWithTime) {
      // Schedule with specific time
      const result = handleScheduleWithTime(
        updatedState,
        task,
        schedulingInfo.dueWithTime,
        schedulingInfo.remindAt ?? undefined,
        schedulingInfo.isMoveToBacklog,
      );
      updatedState = result.state;
      Object.assign(finalTaskChanges, result.additionalChanges);
    } else if (schedulingInfo.day) {
      // Plan for a specific day
      const result = handlePlanForDay(
        updatedState,
        task,
        schedulingInfo.day,
        schedulingInfo.isAddToTop,
      );
      updatedState = result.state;
      Object.assign(finalTaskChanges, result.additionalChanges);
    }
  }

  // Step 3: Apply all task changes at once
  updatedState = {
    ...updatedState,
    [TASK_FEATURE_NAME]: taskAdapter.updateOne(
      {
        id: task.id,
        changes: finalTaskChanges,
      },
      updatedState[TASK_FEATURE_NAME],
    ),
  };

  return updatedState;
};

/**
 * Move task from one project to another.
 */
const moveTaskToProject = (
  state: RootState,
  task: Task,
  currentProjectId: string | null | undefined,
  targetProjectId: string,
): RootState => {
  let updatedState = state;
  const allTaskIds = unique([task.id, ...(task.subTaskIds ?? [])]);

  // Remove from current project if exists
  if (currentProjectId && state[PROJECT_FEATURE_NAME].entities[currentProjectId]) {
    const currentProject = getProject(state, currentProjectId);
    updatedState = updateProject(updatedState, currentProjectId, {
      taskIds: removeTasksFromList(currentProject.taskIds, allTaskIds),
      backlogTaskIds: removeTasksFromList(currentProject.backlogTaskIds, allTaskIds),
    });
  }

  // Add to target project if exists
  if (state[PROJECT_FEATURE_NAME].entities[targetProjectId]) {
    const targetProject = getProject(updatedState, targetProjectId);
    updatedState = updateProject(updatedState, targetProjectId, {
      taskIds: unique([...targetProject.taskIds, task.id]),
    });
  }

  // Update subtasks projectId
  if (task.subTaskIds?.length) {
    const subTaskUpdates: Update<Task>[] = task.subTaskIds.map((id) => ({
      id,
      changes: { projectId: targetProjectId },
    }));
    updatedState = {
      ...updatedState,
      [TASK_FEATURE_NAME]: taskAdapter.updateMany(
        subTaskUpdates,
        updatedState[TASK_FEATURE_NAME],
      ),
    };
  }

  return updatedState;
};

/**
 * Handle scheduling with specific time (dueWithTime).
 * Returns updated state and additional task changes to apply.
 */
const handleScheduleWithTime = (
  state: RootState,
  task: Task,
  dueWithTime: number,
  remindAt: number | undefined,
  isMoveToBacklog: boolean | undefined,
): SchedulingResult => {
  let updatedState = state;
  const currentTask = state[TASK_FEATURE_NAME].entities[task.id] as Task;

  // Collect additional task changes
  const additionalChanges: MutableTaskChanges = {
    dueWithTime,
    dueDay: undefined,
  };

  if (remindAt !== undefined) {
    additionalChanges.remindAt = remindAt;
  }

  // Handle backlog move if requested
  if (isMoveToBacklog && currentTask.projectId) {
    const project = getProjectOrUndefined(updatedState, currentTask.projectId);
    if (project && project.isEnableBacklog) {
      const todaysTaskIdsBefore = project.taskIds;
      const backlogIdsBefore = project.backlogTaskIds;

      if (!backlogIdsBefore.includes(task.id)) {
        updatedState = updateProject(updatedState, currentTask.projectId, {
          taskIds: todaysTaskIdsBefore.filter(filterOutId(task.id)),
          backlogTaskIds: [task.id, ...backlogIdsBefore],
        });
      }
    }
  }

  // Handle today tag update
  const todayTag = getTag(updatedState, TODAY_TAG.id);
  const isScheduledForToday = isToday(dueWithTime);
  const isCurrentlyInToday = todayTag.taskIds.includes(task.id);

  if (isScheduledForToday !== isCurrentlyInToday) {
    // Update TODAY_TAG.taskIds only (TODAY_TAG should NOT be in task.tagIds)
    const newTaskIds = isScheduledForToday
      ? unique([task.id, ...todayTag.taskIds])
      : todayTag.taskIds.filter((id) => id !== task.id);

    updatedState = updateTags(updatedState, [
      {
        id: TODAY_TAG.id,
        changes: { taskIds: newTaskIds },
      },
    ]);
  }

  return { state: updatedState, additionalChanges };
};

/**
 * Handle planning for a specific day (without specific time).
 * Returns updated state and additional task changes to apply.
 */
const handlePlanForDay = (
  state: RootState,
  task: Task,
  day: string,
  isAddToTop: boolean | undefined,
): SchedulingResult => {
  let updatedState = state;
  const todayStr = getDbDateStr();
  const isForToday = day === todayStr;
  const currentTask = state[TASK_FEATURE_NAME].entities[task.id] as Task;

  // Collect additional task changes
  const additionalChanges: MutableTaskChanges = {
    dueDay: day,
    dueWithTime: undefined,
  };

  const todayTag = getTag(updatedState, TODAY_TAG.id);
  const isCurrentlyInToday = todayTag.taskIds.includes(task.id);
  const currentTagIds = currentTask?.tagIds || [];
  const hasTaskTodayTag = currentTagIds.includes(TODAY_TAG.id);

  if (isForToday) {
    // Adding to today - update TODAY_TAG.taskIds for ordering
    // IMPORTANT: TODAY_TAG should NEVER be in task.tagIds (virtual tag pattern)
    // Membership is determined by task.dueDay. See: docs/ai/today-tag-architecture.md
    const newTagTaskIds = unique(
      isAddToTop
        ? [task.id, ...todayTag.taskIds.filter((tid) => tid !== task.id)]
        : [...todayTag.taskIds.filter((tid) => tid !== task.id), task.id],
    );

    updatedState = updateTags(updatedState, [
      {
        id: TODAY_TAG.id,
        changes: { taskIds: newTagTaskIds },
      },
    ]);

    // Ensure TODAY_TAG is NOT in task.tagIds (cleanup if present from legacy data)
    if (hasTaskTodayTag) {
      additionalChanges.tagIds = currentTagIds.filter((id) => id !== TODAY_TAG.id);
    }

    // Remove from planner days if present
    updatedState = removeFromPlannerDays(updatedState, task.id);
  } else {
    // Moving away from today or scheduling for future
    if (isCurrentlyInToday) {
      // Remove from TODAY_TAG.taskIds
      updatedState = updateTags(updatedState, [
        {
          id: TODAY_TAG.id,
          changes: { taskIds: todayTag.taskIds.filter((id) => id !== task.id) },
        },
      ]);
    }

    // Ensure TODAY_TAG is NOT in task.tagIds (cleanup if present from legacy data)
    if (hasTaskTodayTag) {
      additionalChanges.tagIds = currentTagIds.filter((id) => id !== TODAY_TAG.id);
    }

    // Add to planner for the target day
    updatedState = addToPlannerDay(updatedState, task.id, day);
  }

  return { state: updatedState, additionalChanges };
};

/**
 * Remove task from all planner days.
 */
const removeFromPlannerDays = (state: RootState, taskId: string): RootState => {
  if (!state.planner?.days) {
    return state;
  }

  const plannerDaysCopy = { ...state.planner.days };
  let hasChanges = false;

  Object.keys(plannerDaysCopy).forEach((day) => {
    const filtered = plannerDaysCopy[day].filter((id) => id !== taskId);
    if (filtered.length !== plannerDaysCopy[day].length) {
      plannerDaysCopy[day] = filtered;
      hasChanges = true;
    }
  });

  if (!hasChanges) {
    return state;
  }

  return {
    ...state,
    [plannerFeatureKey]: {
      ...state.planner,
      days: plannerDaysCopy,
    },
  };
};

/**
 * Add task to a specific planner day.
 */
const addToPlannerDay = (state: RootState, taskId: string, day: string): RootState => {
  const plannerState = state[plannerFeatureKey as keyof RootState] as any;
  const daysCopy = { ...(plannerState?.days || {}) };

  // First remove from all days
  Object.keys(daysCopy).forEach((d) => {
    if (daysCopy[d].includes(taskId)) {
      daysCopy[d] = daysCopy[d].filter((id: string) => id !== taskId);
    }
  });

  // Add to target day
  daysCopy[day] = unique([taskId, ...(daysCopy[day] || [])]);

  return {
    ...state,
    [plannerFeatureKey]: {
      ...plannerState,
      days: daysCopy,
    },
  };
};

// =============================================================================
// META REDUCER
// =============================================================================

const createActionHandlers = (state: RootState, action: Action): ActionHandlerMap => ({
  [TaskSharedActions.applyShortSyntax.type]: () => {
    const { task, taskChanges, targetProjectId, schedulingInfo } = action as ReturnType<
      typeof TaskSharedActions.applyShortSyntax
    >;
    return handleApplyShortSyntax(
      state,
      task,
      taskChanges,
      targetProjectId,
      schedulingInfo,
    );
  },
});

export const shortSyntaxSharedMetaReducer: MetaReducer = (
  reducer: ActionReducer<RootState, Action>,
) => {
  return (state: unknown, action: Action) => {
    if (!state) return reducer(state as RootState | undefined, action);

    const rootState = state as RootState;
    const actionHandlers = createActionHandlers(rootState, action);
    const handler = actionHandlers[action.type];
    const updatedState = handler ? handler(rootState) : rootState;

    return reducer(updatedState, action);
  };
};
