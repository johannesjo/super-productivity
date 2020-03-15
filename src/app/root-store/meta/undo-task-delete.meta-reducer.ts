import {RootState} from '../root-state';
import {Dictionary} from '@ngrx/entity';
import {Task, TaskWithSubTasks} from '../../features/tasks/task.model';
import {TaskActionTypes} from '../../features/tasks/store/task.actions';
import {PROJECT_FEATURE_NAME} from '../../features/project/store/project.reducer';
import {TASK_FEATURE_NAME} from '../../features/tasks/store/task.reducer';
import {TAG_FEATURE_NAME} from '../../features/tag/store/tag.reducer';

export const UNDO_TASK_DELETE = 'undoTaskDelete';

export interface UndoTaskDeleteState {
  projectId: string;
  taskIdsForProjectBacklog: string[];
  taskIdsForProject: string[];
  tagTaskIdMap: {
    [key: string]: string[];
  };
  deletedTaskEntities: Dictionary<Task>;
}

export const undoTaskDeleteMetaReducer = (reducer) => {

  return (state: RootState, action) => {
    console.log(state, action);

    switch (action.type) {
      case TaskActionTypes.DeleteTask:
        const newState = _createTaskDeleteState(state, action.payload.task);
        console.log(newState);

        return reducer({
          ...state,
          [UNDO_TASK_DELETE]: newState,
        }, action);


      // case TaskActionTypes.UndoDeleteTask:

      default:
        return reducer(state, action);
    }
  };
};

const _createTaskDeleteState = (state: RootState, task: TaskWithSubTasks): UndoTaskDeleteState => {
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
    console.log(tag, tag.taskIds, task.id);
    if (tag.taskIds.includes(task.id)) {
      return {
        ...acc,
        [id]: tag.taskIds,
      };
    } else {
      return acc;
    }
  }, {});

  const taskEntities = state[TASK_FEATURE_NAME].entities;
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
};

