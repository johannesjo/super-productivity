import {RootState} from '../root-state';
import {Dictionary} from '@ngrx/entity';
import {Task, TaskWithSubTasks} from '../../features/tasks/task.model';
import {TaskActionTypes} from '../../features/tasks/store/task.actions';
import {PROJECT_FEATURE_NAME} from '../../features/project/store/project.reducer';
import {TASK_FEATURE_NAME} from '../../features/tasks/store/task.reducer';
import {TAG_FEATURE_NAME, tagAdapter} from '../../features/tag/store/tag.reducer';
import {taskAdapter} from '../../features/tasks/store/task.adapter';


export interface UndoTaskDeleteState {
  projectId: string;
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

export const undoTaskDeleteMetaReducer = (reducer) => {
  return (state: RootState, action) => {
    // console.log(state, action);

    switch (action.type) {
      case TaskActionTypes.DeleteTask:
        U_STORE = _createTaskDeleteState(state, action.payload.task);
        return reducer(state, action);


      case TaskActionTypes.UndoDeleteTask:
        console.log(U_STORE, state);

        let updatedState = state;
        updatedState = {
          ...updatedState,
          [TASK_FEATURE_NAME]: taskAdapter.addMany(
            Object.keys(U_STORE.deletedTaskEntities).map(
              id => U_STORE.deletedTaskEntities[id]
            ), updatedState[TASK_FEATURE_NAME]
          ),
        };

        if (U_STORE.parentTaskId) {
          updatedState = {
            ...updatedState,
            [TASK_FEATURE_NAME]: taskAdapter.updateOne({
              id: U_STORE.parentTaskId,
              changes: {
                subTaskIds: U_STORE.subTaskIds,
              }
            }, updatedState[TASK_FEATURE_NAME]),
          };
        }

        if (U_STORE.tagTaskIdMap) {
          updatedState = {
            ...updatedState,
            [TAG_FEATURE_NAME]: tagAdapter.updateMany(
              Object.keys(U_STORE.tagTaskIdMap).map(id => ({
                  id,
                  changes: {
                    taskIds: U_STORE.tagTaskIdMap[id]
                  }
                })
              ), updatedState[TAG_FEATURE_NAME]),
          };
        }

        console.log(updatedState);

        return reducer(updatedState, action);
    }

    return reducer(state, action);
  };
};

const _createTaskDeleteState = (state: RootState, task: TaskWithSubTasks): UndoTaskDeleteState => {
  const taskEntities = state[TASK_FEATURE_NAME].entities;

  if (task.parentId) {
    return {
      projectId: task.projectId,
      parentTaskId: task.parentId,
      subTaskIds: taskEntities[task.parentId].subTaskIds,
      deletedTaskEntities: {
        [task.id]: taskEntities[task.id]
      }
    };
  } else {
    const project = state[PROJECT_FEATURE_NAME].entities[task.projectId];
    const taskIdsForProjectBacklog = (task.projectId && project.backlogTaskIds.includes(task.id))
      ? project.backlogTaskIds
      : [];
    const taskIdsForProject = (task.projectId && project.taskIds.includes(task.id))
      ? project.taskIds
      : [];

    const tagState = state[TAG_FEATURE_NAME];
    const tagTaskIdMap = (task.tagIds).reduce((acc, id) => {
      const tag = tagState.entities[id];
      if (tag.taskIds.includes(task.id)) {
        return {
          ...acc,
          [id]: tag.taskIds,
        };
      } else {
        return acc;
      }
    }, {});

    const deletedTaskEntities = [task.id, ...task.subTaskIds].reduce((acc, id) => {
      return {
        ...acc,
        [id]: taskEntities[id],
      };
    }, {});

    // TODO handle sub task only case
    return {
      projectId: task.projectId,
      taskIdsForProjectBacklog,
      taskIdsForProject,
      tagTaskIdMap,
      deletedTaskEntities
    };
  }
};

