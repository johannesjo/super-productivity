import { RootState } from '../root-state';
import { Dictionary } from '@ngrx/entity';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { deleteTask, undoDeleteTask } from '../../features/tasks/store/task.actions';
import {
  PROJECT_FEATURE_NAME,
  projectAdapter,
} from '../../features/project/store/project.reducer';
import { TASK_FEATURE_NAME } from '../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME, tagAdapter } from '../../features/tag/store/tag.reducer';
import { taskAdapter } from '../../features/tasks/store/task.adapter';
import { Project } from '../../features/project/project.model';
import { Action, ActionReducer } from '@ngrx/store/src/models';
import { TODAY_TAG } from '../../features/tag/tag.const';

export interface UndoTaskDeleteState {
  projectId?: string;
  taskIdsForProjectBacklog?: string[];
  taskIdsForProject?: string[];

  tagTaskIdMap?: {
    [key: string]: string[];
  };

  parentTaskId?: string;
  subTaskIds?: string[];

  deletedTaskEntities: Dictionary<Task>;
}

let U_STORE: UndoTaskDeleteState;

export const undoTaskDeleteMetaReducer = (
  reducer: ActionReducer<any, any>,
): ActionReducer<any, any> => {
  return (state: RootState, action: Action) => {
    switch (action.type) {
      case deleteTask.type:
        U_STORE = _createTaskDeleteState(
          state,
          (action as ReturnType<typeof deleteTask>).task,
        );
        return reducer(state, action);

      case undoDeleteTask.type:
        let updatedState = state;
        const tasksToRestore: Task[] = Object.keys(U_STORE.deletedTaskEntities)
          .map((id: string) => U_STORE.deletedTaskEntities[id])
          .filter((t) => {
            if (!t) {
              throw new Error('Task Restore Error: Missing task data when restoruii');
            }
            return true;
          }) as Task[];

        updatedState = {
          ...updatedState,
          [TASK_FEATURE_NAME]: taskAdapter.addMany(
            tasksToRestore,
            updatedState[TASK_FEATURE_NAME],
          ),
        };

        if (U_STORE.parentTaskId) {
          updatedState = {
            ...updatedState,
            [TASK_FEATURE_NAME]: taskAdapter.updateOne(
              {
                id: U_STORE.parentTaskId,
                changes: {
                  subTaskIds: U_STORE.subTaskIds,
                },
              },
              updatedState[TASK_FEATURE_NAME],
            ),
          };
        }

        if (U_STORE.tagTaskIdMap) {
          updatedState = {
            ...updatedState,
            [TAG_FEATURE_NAME]: tagAdapter.updateMany(
              Object.keys(U_STORE.tagTaskIdMap).map((id) => {
                if (!U_STORE.tagTaskIdMap) {
                  throw new Error(
                    'Task Restore Error: Missing tagTaskIdMap data for restoring task',
                  );
                }
                if (!U_STORE.tagTaskIdMap[id]) {
                  throw new Error(
                    'Task Restore Error: Missing tag data for restoring task',
                  );
                }
                return {
                  id,
                  changes: {
                    taskIds: U_STORE.tagTaskIdMap[id],
                  },
                };
              }),
              updatedState[TAG_FEATURE_NAME],
            ),
          };
        }

        if (U_STORE.projectId) {
          updatedState = {
            ...updatedState,
            [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
              {
                id: U_STORE.projectId,
                changes: {
                  ...(U_STORE.taskIdsForProject
                    ? { taskIds: U_STORE.taskIdsForProject }
                    : {}),
                  ...(U_STORE.taskIdsForProjectBacklog
                    ? { backlogTaskIds: U_STORE.taskIdsForProjectBacklog }
                    : {}),
                },
              },
              updatedState[PROJECT_FEATURE_NAME],
            ),
          };
        }

        return reducer(updatedState, action);
    }

    return reducer(state, action);
  };
};

const _createTaskDeleteState = (
  state: RootState,
  task: TaskWithSubTasks,
): UndoTaskDeleteState => {
  const taskEntities = state[TASK_FEATURE_NAME].entities;
  const deletedTaskEntities = [task.id, ...task.subTaskIds].reduce((acc, id) => {
    return {
      ...acc,
      [id]: taskEntities[id],
    };
  }, {});

  // SUB TASK CASE
  // Note: should work independent as sub tasks dont show up in tag or project lists
  if (task.parentId) {
    return {
      projectId: task.projectId,
      parentTaskId: task.parentId,
      subTaskIds: (taskEntities[task.parentId] as Task).subTaskIds,
      deletedTaskEntities,
    };
  } else {
    // PROJECT CASE
    const project: Project | undefined =
      state[PROJECT_FEATURE_NAME].entities[task.projectId as string];
    const isProjectTask = task.projectId !== null && project !== undefined;

    let taskIdsForProjectBacklog;
    let taskIdsForProject;
    if (isProjectTask) {
      taskIdsForProjectBacklog = (project as Project).backlogTaskIds;
      taskIdsForProject = (project as Project).taskIds;
      if (
        !taskIdsForProject ||
        !taskIdsForProjectBacklog ||
        (!taskIdsForProjectBacklog.length && !taskIdsForProject.length)
      ) {
        console.log('------ERR_ADDITIONAL_INFO------');
        console.log('project', project);
        console.log('taskIdsForProject', taskIdsForProject);
        console.log('taskIdsForProjectBacklog', taskIdsForProjectBacklog);
        throw new Error('Invalid project data');
      }
    }

    const tagState = state[TAG_FEATURE_NAME];
    const tagTaskIdMap = [TODAY_TAG.id, ...task.tagIds].reduce((acc, id) => {
      const tag = tagState.entities[id];
      if (!tag) {
        console.log('------ERR_ADDITIONAL_INFO------');
        console.log('id', id);
        console.log('tagState', tagState);
        console.log('tagTaskIdMap', tagTaskIdMap);
        throw new Error('Task Restore Error: Missing tag');
      }

      if (tag.taskIds.includes(task.id)) {
        return {
          ...acc,
          [id]: tag.taskIds,
        };
      } else {
        return acc;
      }
    }, {});

    return {
      projectId: task.projectId,
      taskIdsForProjectBacklog,
      taskIdsForProject,
      tagTaskIdMap,
      deletedTaskEntities,
    };
  }
};
