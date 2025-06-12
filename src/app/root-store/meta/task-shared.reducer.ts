import { ActionReducer, Action } from '@ngrx/store';
import { RootState } from '../root-state';
import {
  addTask,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveToArchive_,
  restoreTask,
  scheduleTaskWithTime,
  unScheduleTask,
} from '../../features/tasks/store/task.actions';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../../features/tag/store/tag.reducer';
import { projectAdapter } from '../../features/project/store/project.reducer';
import { tagAdapter } from '../../features/tag/store/tag.reducer';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { Update } from '@ngrx/entity';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { getWorklogStr } from '../../util/get-work-log-str';
import { unique } from '../../util/unique';
import { isToday } from '../../util/is-today.util';

type ProjectTaskList = 'backlogTaskIds' | 'taskIds';

const updateProjectWithTask = (
  state: RootState,
  task: { id: string; projectId: string },
  isAddToBottom: boolean,
  isAddToBacklog: boolean,
): RootState => {
  if (!task.projectId || !state[PROJECT_FEATURE_NAME].entities[task.projectId]) {
    return state;
  }

  const affectedProject = state[PROJECT_FEATURE_NAME].entities[task.projectId] as Project;
  const targetList: ProjectTaskList =
    isAddToBacklog && affectedProject.isEnableBacklog ? 'backlogTaskIds' : 'taskIds';

  const newTaskIds = isAddToBottom
    ? [...affectedProject[targetList], task.id]
    : [task.id, ...affectedProject[targetList]];

  return {
    ...state,
    [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
      {
        id: task.projectId,
        changes: { [targetList]: newTaskIds },
      },
      state[PROJECT_FEATURE_NAME],
    ),
  };
};

const updateTagsWithTask = (
  state: RootState,
  task: { id: string; tagIds: string[]; dueDay?: string },
  isAddToBottom: boolean,
): RootState => {
  const tagIdsToUpdate = [
    ...task.tagIds,
    ...(task.dueDay === getWorklogStr() ? [TODAY_TAG.id] : []),
  ];

  const tagUpdates: Update<Tag>[] = tagIdsToUpdate.map((tagId) => {
    const existingTag = state[TAG_FEATURE_NAME].entities[tagId] as Tag;
    const newTaskIds = isAddToBottom
      ? [...existingTag.taskIds, task.id]
      : [task.id, ...existingTag.taskIds];

    return {
      id: tagId,
      changes: { taskIds: newTaskIds },
    };
  });

  return {
    ...state,
    [TAG_FEATURE_NAME]: tagAdapter.updateMany(tagUpdates, state[TAG_FEATURE_NAME]),
  };
};

export const taskSharedMetaReducer = (
  reducer: ActionReducer<RootState, Action>,
): ActionReducer<RootState, Action> => {
  return (state: RootState | undefined, action: Action) => {
    if (!state) {
      return reducer(state, action);
    }
    switch (action.type) {
      case addTask.type: {
        const { task, isAddToBottom, isAddToBacklog } = action as ReturnType<
          typeof addTask
        >;

        let updatedState = updateProjectWithTask(
          state,
          task,
          isAddToBottom,
          isAddToBacklog,
        );
        updatedState = updateTagsWithTask(updatedState, task, isAddToBottom);

        return reducer(updatedState, action);
      }

      case convertToMainTask.type: {
        const { task, parentTagIds, isPlanForToday } = action as ReturnType<
          typeof convertToMainTask
        >;

        let updatedState = updateProjectWithConvertToMainTask(state, task);
        updatedState = updateTagsWithConvertToMainTask(
          updatedState,
          task,
          parentTagIds,
          isPlanForToday,
        );

        return reducer(updatedState, action);
      }

      case deleteTask.type: {
        const { task } = action as ReturnType<typeof deleteTask>;

        let updatedState = updateProjectWithDeleteTask(state, task);
        updatedState = updateTagsWithDeleteTask(updatedState, task);

        return reducer(updatedState, action);
      }

      case deleteTasks.type: {
        const { taskIds } = action as ReturnType<typeof deleteTasks>;

        const updatedState = updateTagsWithDeleteTasks(state, taskIds);

        return reducer(updatedState, action);
      }

      case moveToArchive_.type: {
        const { tasks } = action as ReturnType<typeof moveToArchive_>;

        let updatedState = updateProjectsWithMoveToArchive(state, tasks);
        updatedState = updateTagsWithMoveToArchive(updatedState, tasks);

        return reducer(updatedState, action);
      }

      case restoreTask.type: {
        const { task, subTasks } = action as ReturnType<typeof restoreTask>;

        let updatedState = updateProjectWithRestoreTask(state, task);
        updatedState = updateTagsWithRestoreTask(updatedState, task, subTasks);

        return reducer(updatedState, action);
      }

      case scheduleTaskWithTime.type: {
        const { task, dueWithTime } = action as ReturnType<typeof scheduleTaskWithTime>;

        const updatedState = updateTagsWithScheduleTaskWithTime(state, task, dueWithTime);

        return reducer(updatedState, action);
      }

      case unScheduleTask.type: {
        const { id } = action as ReturnType<typeof unScheduleTask>;

        const updatedState = updateTagsWithUnScheduleTask(state, id);

        return reducer(updatedState, action);
      }

      default:
        return reducer(state, action);
    }
  };
};

const updateProjectWithConvertToMainTask = (
  state: RootState,
  task: { id: string; projectId?: string | null },
): RootState => {
  if (!task.projectId || !state[PROJECT_FEATURE_NAME].entities[task.projectId]) {
    return state;
  }

  const affectedProject = state[PROJECT_FEATURE_NAME].entities[task.projectId] as Project;
  return {
    ...state,
    [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
      {
        id: task.projectId,
        changes: {
          taskIds: [task.id, ...affectedProject.taskIds],
        },
      },
      state[PROJECT_FEATURE_NAME],
    ),
  };
};

const updateTagsWithConvertToMainTask = (
  state: RootState,
  task: { id: string },
  parentTagIds: string[],
  isPlanForToday?: boolean,
): RootState => {
  const tagIdsToUpdate = [...parentTagIds, ...(isPlanForToday ? [TODAY_TAG.id] : [])];

  const tagUpdates: Update<Tag>[] = tagIdsToUpdate.map((tagId) => {
    const existingTag = state[TAG_FEATURE_NAME].entities[tagId] as Tag;
    return {
      id: tagId,
      changes: {
        taskIds: [task.id, ...existingTag.taskIds],
      },
    };
  });

  return {
    ...state,
    [TAG_FEATURE_NAME]: tagAdapter.updateMany(tagUpdates, state[TAG_FEATURE_NAME]),
  };
};

const updateProjectWithDeleteTask = (
  state: RootState,
  task: { id: string; projectId?: string | null; subTaskIds?: string[] },
): RootState => {
  if (!task.projectId || !state[PROJECT_FEATURE_NAME].entities[task.projectId]) {
    return state;
  }

  const project = state[PROJECT_FEATURE_NAME].entities[task.projectId] as Project;
  return {
    ...state,
    [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
      {
        id: task.projectId,
        changes: {
          taskIds: project.taskIds.filter((ptId) => ptId !== task.id),
          backlogTaskIds: project.backlogTaskIds.filter((ptId) => ptId !== task.id),
        },
      },
      state[PROJECT_FEATURE_NAME],
    ),
  };
};

const updateTagsWithDeleteTask = (
  state: RootState,
  task: { id: string; tagIds: string[]; subTasks?: any[]; subTaskIds?: string[] },
): RootState => {
  const affectedTagIds: string[] = [task, ...(task.subTasks || [])].reduce(
    (acc, t) => [...acc, ...t.tagIds],
    // always check today list too
    [TODAY_TAG.id] as string[],
  );
  const removedTasksIds: string[] = [task.id, ...(task.subTaskIds || [])];
  const tagUpdates: Update<Tag>[] = affectedTagIds.map((tagId) => {
    return {
      id: tagId,
      changes: {
        taskIds: (state[TAG_FEATURE_NAME].entities[tagId] as Tag).taskIds.filter(
          (taskIdForTag) => !removedTasksIds.includes(taskIdForTag),
        ),
      },
    };
  });
  return {
    ...state,
    [TAG_FEATURE_NAME]: tagAdapter.updateMany(tagUpdates, state[TAG_FEATURE_NAME]),
  };
};

const updateTagsWithDeleteTasks = (state: RootState, taskIds: string[]): RootState => {
  const tagUpdates: Update<Tag>[] = (state[TAG_FEATURE_NAME].ids as string[]).map(
    (tagId) => ({
      id: tagId,
      changes: {
        taskIds: (state[TAG_FEATURE_NAME].entities[tagId] as Tag).taskIds.filter(
          (taskId) => !taskIds.includes(taskId),
        ),
      },
    }),
  );
  return {
    ...state,
    [TAG_FEATURE_NAME]: tagAdapter.updateMany(tagUpdates, state[TAG_FEATURE_NAME]),
  };
};

const updateProjectsWithMoveToArchive = (
  state: RootState,
  tasks: TaskWithSubTasks[],
): RootState => {
  const taskIdsToMoveToArchive = tasks.map((t: Task) => t.id);
  const projectIds = unique<string>(
    tasks
      .map((t: Task) => t.projectId || null)
      .filter((pid: string | null) => !!pid) as string[],
  );
  const updates: Update<Project>[] = projectIds.map((pid: string) => ({
    id: pid,
    changes: {
      taskIds: (state[PROJECT_FEATURE_NAME].entities[pid] as Project).taskIds.filter(
        (taskId) => !taskIdsToMoveToArchive.includes(taskId),
      ),
      backlogTaskIds: (
        state[PROJECT_FEATURE_NAME].entities[pid] as Project
      ).backlogTaskIds.filter((taskId) => !taskIdsToMoveToArchive.includes(taskId)),
    },
  }));
  return {
    ...state,
    [PROJECT_FEATURE_NAME]: projectAdapter.updateMany(
      updates,
      state[PROJECT_FEATURE_NAME],
    ),
  };
};

const updateTagsWithMoveToArchive = (
  state: RootState,
  tasks: TaskWithSubTasks[],
): RootState => {
  const taskIdsToMoveToArchive = tasks.flatMap((t) => [
    t.id,
    ...t.subTasks.map((st) => st.id),
  ]);
  const tagIds = unique([
    // always cleanup inbox and today tag
    TODAY_TAG.id,
    ...tasks.flatMap((t) => [...t.tagIds, ...t.subTasks.flatMap((st) => st.tagIds)]),
  ]);
  const tagUpdates: Update<Tag>[] = tagIds.map((tId: string) => ({
    id: tId,
    changes: {
      taskIds: (state[TAG_FEATURE_NAME].entities[tId] as Tag).taskIds.filter(
        (taskId) => !taskIdsToMoveToArchive.includes(taskId),
      ),
    },
  }));
  return {
    ...state,
    [TAG_FEATURE_NAME]: tagAdapter.updateMany(tagUpdates, state[TAG_FEATURE_NAME]),
  };
};

const updateProjectWithRestoreTask = (
  state: RootState,
  task: { id: string; projectId?: string | null },
): RootState => {
  if (!task.projectId) {
    return state;
  }

  return {
    ...state,
    [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
      {
        id: task.projectId,
        changes: {
          taskIds: [
            ...(state[PROJECT_FEATURE_NAME].entities[task.projectId] as Project).taskIds,
            task.id,
          ],
        },
      },
      state[PROJECT_FEATURE_NAME],
    ),
  };
};

const updateTagsWithRestoreTask = (
  state: RootState,
  task: { id: string; tagIds: string[] },
  subTasks: Task[],
): RootState => {
  const allTasks = [task, ...subTasks];

  // Create a map of tagIds to an array of associated task and subtask IDs
  const tagTaskMap: { [tagId: string]: string[] } = {};
  allTasks.forEach((t) => {
    t.tagIds.forEach((tagId) => {
      if (!tagTaskMap[tagId]) {
        tagTaskMap[tagId] = [];
      }
      tagTaskMap[tagId].push(t.id);
    });
  });

  // Create updates from the map
  const updates = Object.entries(tagTaskMap)
    .filter(([tagId]) => !!(state[TAG_FEATURE_NAME].entities[tagId] as Tag)) // If the tag model is gone we don't update
    .map(([tagId, taskIds]) => ({
      id: tagId,
      changes: {
        taskIds: [
          ...(state[TAG_FEATURE_NAME].entities[tagId] as Tag).taskIds,
          ...taskIds,
        ],
      },
    }));

  return {
    ...state,
    [TAG_FEATURE_NAME]: tagAdapter.updateMany(updates, state[TAG_FEATURE_NAME]),
  };
};

const updateTagsWithScheduleTaskWithTime = (
  state: RootState,
  task: { id: string },
  dueWithTime: number,
): RootState => {
  const todayTag = state[TAG_FEATURE_NAME].entities[TODAY_TAG.id] as Tag;
  const isTaskScheduledForToday = isToday(dueWithTime);
  const isTaskCurrentlyInToday = todayTag.taskIds.includes(task.id);

  if (!isTaskCurrentlyInToday && isTaskScheduledForToday) {
    return {
      ...state,
      [TAG_FEATURE_NAME]: tagAdapter.updateOne(
        {
          id: TODAY_TAG.id,
          changes: {
            taskIds: [task.id, ...todayTag.taskIds],
          },
        },
        state[TAG_FEATURE_NAME],
      ),
    };
  }

  if (isTaskCurrentlyInToday && !isTaskScheduledForToday) {
    return {
      ...state,
      [TAG_FEATURE_NAME]: tagAdapter.updateOne(
        {
          id: TODAY_TAG.id,
          changes: {
            taskIds: todayTag.taskIds.filter((id) => id !== task.id),
          },
        },
        state[TAG_FEATURE_NAME],
      ),
    };
  }

  return state;
};

const updateTagsWithUnScheduleTask = (state: RootState, taskId: string): RootState => {
  const todayTag = state[TAG_FEATURE_NAME].entities[TODAY_TAG.id] as Tag;

  if (todayTag.taskIds.includes(taskId)) {
    return {
      ...state,
      [TAG_FEATURE_NAME]: tagAdapter.updateOne(
        {
          id: TODAY_TAG.id,
          changes: {
            taskIds: todayTag.taskIds.filter((id) => id !== taskId),
          },
        },
        state[TAG_FEATURE_NAME],
      ),
    };
  }

  return state;
};
