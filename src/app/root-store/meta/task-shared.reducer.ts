import { ActionReducer, Action } from '@ngrx/store';
import { RootState } from '../root-state';
import {
  addTask,
  convertToMainTask,
  deleteTask,
} from '../../features/tasks/store/task.actions';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../../features/tag/store/tag.reducer';
import { projectAdapter } from '../../features/project/store/project.reducer';
import { tagAdapter } from '../../features/tag/store/tag.reducer';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { Update } from '@ngrx/entity';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { getWorklogStr } from '../../util/get-work-log-str';

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
