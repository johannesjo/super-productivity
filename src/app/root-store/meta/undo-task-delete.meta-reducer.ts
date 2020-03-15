import {RootState} from '../root-state';
import {WorkContextType} from '../../features/work-context/work-context.model';
import {Dictionary} from '@ngrx/entity';
import {Task, TaskWithSubTasks} from '../../features/tasks/task.model';
import {TaskActionTypes} from '../../features/tasks/store/task.actions';
import {WORK_CONTEXT_FEATURE_NAME} from '../../features/work-context/store/work-context.reducer';
import {PROJECT_FEATURE_NAME} from '../../features/project/store/project.reducer';
import {TAG_FEATURE_NAME} from '../../features/tag/store/tag.reducer';
import {TASK_FEATURE_NAME} from '../../features/tasks/store/task.reducer';

export const UNDO_TASK_DELETE = 'undoTaskDelete';

export interface UndoTaskDeleteState {
  workContextId: string;
  workContextType: WorkContextType;
  taskIdsForProject: string[];
  isForBacklog: boolean;
  deletedTaskEntities: Dictionary<Task>;
}

export const undoTaskDeleteMetaReducer = (reducer) => {

  return (state: RootState, action) => {

    switch (action.type) {
      case TaskActionTypes.DeleteTask:
        console.log(_createTaskDeleteState(state, action.payload.task));

        return reducer({
          ...state,
          [UNDO_TASK_DELETE]: _createTaskDeleteState(state, action.payload.task),
        }, action);


      // case TaskActionTypes.UndoDeleteTask:

      default:
        return reducer(state, action);
    }
  };
};

const _createTaskDeleteState = (state: RootState, task: TaskWithSubTasks): UndoTaskDeleteState => {
  const {activeType, activeId} = state[WORK_CONTEXT_FEATURE_NAME];

  let taskIds;
  let isForBacklog = false;

  if (activeType === WorkContextType.PROJECT) {
    const project = state[PROJECT_FEATURE_NAME].entities[activeId];
    isForBacklog = (project.backlogTaskIds.includes(task.id));
    taskIds = isForBacklog ? project.backlogTaskIds : project.taskIds;
  } else {
    const tag = state[TAG_FEATURE_NAME].entities[activeId];
    taskIds = tag.taskIds;
  }

  if (taskIds.includes(task.id)) {
    throw new Error('Create Task Delete State sanity check failed');
  }

  const taskEntities = state[TASK_FEATURE_NAME].entities;
  const deletedTaskEntities = [task.id, ...task.subTaskIds].reduce((acc, id) => {
    return {
      ...acc,
      [id]: taskEntities[id],
    };
  }, {});

  return {
    workContextId: activeId,
    workContextType: activeType,
    taskIds,
    isForBacklog,
    deletedTaskEntities
  };
};

