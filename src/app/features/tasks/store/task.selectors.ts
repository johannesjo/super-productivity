import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TASK_FEATURE_NAME } from './task.reducer';
import { Task, TaskPlanned, TaskState, TaskWithSubTasks } from '../task.model';
import { taskAdapter } from './task.adapter';
import { devError } from '../../../util/dev-error';
import { TODAY_TAG } from '../../tag/tag.const';
import { IssueProvider } from '../../issue/issue.model';

// TODO fix null stuff here

const mapSubTasksToTasks = (tasksIN: any[]): TaskWithSubTasks[] => {
  return tasksIN
    .filter((task) => !task.parentId)
    .map((task) => {
      if (task.subTaskIds && task.subTaskIds.length > 0) {
        return {
          ...task,
          subTasks: task.subTaskIds.map((subTaskId: string) =>
            tasksIN.find((taskIN) => taskIN.id === subTaskId),
          ),
        };
      } else {
        return task;
      }
    });
};
export const mapSubTasksToTask = (
  task: Task | null,
  s: TaskState,
): TaskWithSubTasks | null => {
  if (!task) {
    return null;
  }
  return {
    ...task,
    subTasks: task.subTaskIds.map((id) => {
      const subTask = s.entities[id] as Task;
      if (!subTask) {
        devError('Task data not found for ' + id);
      }
      return subTask;
    }),
  };
};

export const flattenTasks = (tasksIN: TaskWithSubTasks[]): TaskWithSubTasks[] => {
  let flatTasks: TaskWithSubTasks[] = [];
  tasksIN.forEach((task) => {
    flatTasks.push(task);
    if (task.subTasks) {
      // NOTE: in order for the model to be identical we add an empty subTasks array
      flatTasks = flatTasks.concat(task.subTasks.map((t) => ({ ...t, subTasks: [] })));
    }
  });
  return flatTasks;
};

// SELECTORS
// ---------
const { selectEntities, selectAll } = taskAdapter.getSelectors();
export const selectTaskFeatureState = createFeatureSelector<TaskState>(TASK_FEATURE_NAME);
export const selectTaskEntities = createSelector(selectTaskFeatureState, selectEntities);
export const selectCurrentTaskId = createSelector(
  selectTaskFeatureState,
  (state) => state.currentTaskId,
);
export const selectIsTaskDataLoaded = createSelector(
  selectTaskFeatureState,
  (state) => state.isDataLoaded,
);
export const selectCurrentTask = createSelector(selectTaskFeatureState, (s) =>
  s.currentTaskId ? (s.entities[s.currentTaskId] as Task) : null,
);
export const selectLastCurrentTask = createSelector(selectTaskFeatureState, (s) =>
  s.lastCurrentTaskId ? (s.entities[s.lastCurrentTaskId] as Task) : null,
);

export const selectCurrentTaskOrParentWithData = createSelector(
  selectTaskFeatureState,
  (s): TaskWithSubTasks | null => {
    const t =
      (s.currentTaskId &&
        s.entities[s.currentTaskId] &&
        // @ts-ignore
        s.entities[s.currentTaskId].parentId &&
        // @ts-ignore
        s.entities[s.entities[s.currentTaskId].parentId]) ||
      // @ts-ignore
      s.entities[s.currentTaskId];
    return mapSubTasksToTask(t as Task, s);
  },
);

export const selectStartableTasks = createSelector(
  selectTaskFeatureState,
  (s): Task[] => {
    return s.ids
      .map((id) => s.entities[id] as Task)
      .filter(
        (task) => !task.isDone && (!!task.parentId || task.subTaskIds.length === 0),
      );
  },
);

// export const selectJiraTasks = createSelector(
//   selectTaskFeatureState,
//   (s): Task[] => {
//     return s.ids
//       .map(id => s.entities[id])
//       .filter((task: Task) => task.issueType === JIRA_TYPE);
//   });
//
// export const selectGithubTasks = createSelector(
//   selectTaskFeatureState,
//   (s): Task[] => {
//     return s.ids
//       .map(id => s.entities[id])
//       .filter((task: Task) => task.issueType === GITHUB_TYPE);
//   });
//
// export const selectGitlabTasks = createSelector(
//   selectTaskFeatureState,
//   (s): Task[] => {
//     return s.ids
//       .map(id => s.entities[id])
//       .filter((task: Task) => task.issueType === GITLAB_TYPE);
//   });

export const selectSelectedTaskId = createSelector(
  selectTaskFeatureState,
  (state) => state.selectedTaskId,
);
export const selectTaskDetailTargetPanel = createSelector(
  selectTaskFeatureState,
  (state: TaskState) => state.taskDetailTargetPanel,
);
export const selectSelectedTask = createSelector(
  selectTaskFeatureState,
  (s): TaskWithSubTasks => {
    // @ts-ignore
    return s.selectedTaskId && mapSubTasksToTask(s.entities[s.selectedTaskId], s);
  },
);

export const selectCurrentTaskParentOrCurrent = createSelector(
  selectTaskFeatureState,
  (s): Task =>
    (s.currentTaskId &&
      s.entities[s.currentTaskId] &&
      // @ts-ignore
      s.entities[s.currentTaskId].parentId &&
      // @ts-ignore
      s.entities[s.entities[s.currentTaskId].parentId]) ||
    // @ts-ignore
    s.entities[s.currentTaskId],
);

// export const selectScheduledTasksWithReminder = createSelector(
//   selectPlannedTasks,
//   (tasks: Task[]): TaskWithReminder[] =>
//     tasks.filter((task) => !!task.reminderId) as TaskWithReminder[],
// );

export const selectAllTasks = createSelector(selectTaskFeatureState, selectAll);

export const selectAllTasksWithSubTasks = createSelector(
  selectAllTasks,
  mapSubTasksToTasks,
);

export const selectAllDoneIds = createSelector(
  selectAllTasks,
  (tasks: Task[]): string[] => tasks.filter((t) => t.isDone).map((t) => t.id),
);

// DYNAMIC SELECTORS
// -----------------
export const selectTaskById = createSelector(
  selectTaskFeatureState,
  (state: TaskState, props: { id: string }): Task => state.entities[props.id] as Task,
);

export const selectTaskByIssueId = createSelector(
  selectAllTasks,
  (tasks: Task[], props: { issueId: string }): Task | undefined =>
    tasks.find((t) => t.issueId === props.issueId),
);

export const selectTasksById = createSelector(
  selectTaskFeatureState,
  (state: TaskState, props: { ids: string[] }): Task[] =>
    props.ids ? (props.ids.map((id) => state.entities[id]) as Task[]) : [],
);

export const selectPlannedTasksById = createSelector(
  selectTaskFeatureState,
  (state: TaskState, props: { ids: string[] }): Task[] =>
    props.ids
      ? (props.ids.map((id) => state.entities[id]) as Task[])
          // there is a short moment when the reminder is already there but the task is not
          // and there is another when a tasks get deleted
          .filter((task) => !!task?.plannedAt)
      : [],
);

export const selectTasksWithSubTasksByIds = createSelector(
  selectTaskFeatureState,
  (state: TaskState, props: { ids: string[] }): TaskWithSubTasks[] =>
    props.ids.map((id: string) => {
      const task = state.entities[id];
      if (!task) {
        devError('Task data not found for ' + id);
      }
      return mapSubTasksToTask(task as Task, state) as TaskWithSubTasks;
    }),
);

export const selectTaskByIdWithSubTaskData = createSelector(
  selectTaskFeatureState,
  (state: TaskState, props: { id: string }): TaskWithSubTasks => {
    const task = state.entities[props.id];
    if (!task) {
      devError('Task data not found for ' + props.id);
    }
    return mapSubTasksToTask(task as Task, state) as TaskWithSubTasks;
  },
);

export const selectMainTasksWithoutTag = createSelector(
  selectAllTasks,
  (tasks: Task[], props: { tagId: string }): Task[] =>
    tasks.filter((task) => !task.parentId && !task.tagIds.includes(props.tagId)),
);

export const selectAllCalendarTaskEventIds = createSelector(
  selectAllTasks,
  (tasks: Task[]): string[] =>
    tasks.filter((task) => task.issueType === 'ICAL').map((t) => t.issueId as string),
);

export const selectTasksWorkedOnOrDoneFlat = createSelector(
  selectAllTasks,
  (tasks: Task[], props: { day: string }) => {
    if (!props) {
      return null;
    }

    const todayStr = props.day;
    return tasks.filter(
      (t: Task) =>
        t.isDone ||
        (t.timeSpentOnDay &&
          t.timeSpentOnDay[todayStr] &&
          t.timeSpentOnDay[todayStr] > 0),
    );
  },
);

export const selectTasksPlannedForRange = createSelector(
  selectAllTasks,
  (tasks: Task[], { start, end }: { start: number; end: number }): TaskPlanned[] => {
    return tasks.filter(
      (task) =>
        !task.isDone &&
        typeof task.plannedAt === 'number' &&
        task.plannedAt >= start &&
        task.plannedAt <= end,
    ) as TaskPlanned[];
  },
);

export const selectTasksPlannedForRangeNotOnToday = createSelector(
  selectAllTasks,
  (tasks: Task[], { start, end }: { start: number; end: number }): TaskPlanned[] => {
    return tasks.filter(
      (task) =>
        !task.isDone &&
        typeof task.plannedAt === 'number' &&
        task.plannedAt >= start &&
        task.plannedAt <= end &&
        !task.tagIds.includes(TODAY_TAG.id),
    ) as TaskPlanned[];
  },
);
// export const selectTasksPlannedForRange

// REPEATABLE TASKS
// ----------------
export const selectAllRepeatableTaskWithSubTasks = createSelector(
  selectAllTasksWithSubTasks,
  (tasks: TaskWithSubTasks[]) => {
    return tasks.filter((task) => !!task.repeatCfgId);
  },
);
export const selectAllRepeatableTaskWithSubTasksFlat = createSelector(
  selectAllRepeatableTaskWithSubTasks,
  flattenTasks,
);

export const selectTasksByRepeatConfigId = createSelector(
  selectTaskFeatureState,
  (state: TaskState, props: { repeatCfgId: string }): Task[] => {
    const ids = state.ids as string[];
    const taskIds = ids.filter(
      (idIN) =>
        state.entities[idIN] &&
        // @ts-ignore
        state.entities[idIN].repeatCfgId === props.repeatCfgId,
    );

    return taskIds.map((id) => state.entities[id] as Task);
  },
);

export const selectTaskWithSubTasksByRepeatConfigId = createSelector(
  selectAllTasksWithSubTasks,
  (tasks: TaskWithSubTasks[], props: { repeatCfgId: string }) => {
    return tasks.filter((task) => task.repeatCfgId === props.repeatCfgId);
  },
);

export const selectTasksByTag = createSelector(
  selectAllTasksWithSubTasks,
  (tasks: TaskWithSubTasks[], props: { tagId: string }) => {
    return tasks.filter((task) => task.tagIds.indexOf(props.tagId) !== -1);
  },
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const selectAllTaskIssueIdsForIssueProvider = (issueProvider: IssueProvider) => {
  return createSelector(selectAllTasks, (tasks: Task[]): string[] => {
    return tasks
      .filter((task) => task.issueProviderId === issueProvider.id)
      .map((t) => t.issueId as string);
  });
};
