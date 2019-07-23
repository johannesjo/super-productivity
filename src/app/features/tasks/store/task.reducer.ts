import {createEntityAdapter, EntityAdapter, EntityState} from '@ngrx/entity';
import {TaskActions, TaskActionTypes} from './task.actions';
import {DEFAULT_TASK, ShowSubTasksMode, Task, TaskWithSubTasks, TimeSpentOnDay} from '../task.model';
import {calcTotalTimeSpent} from '../util/calc-total-time-spent';
import {arrayMoveLeft, arrayMoveRight} from '../../../util/array-move';
import {AddAttachment, AttachmentActionTypes, DeleteAttachment} from '../../attachment/store/attachment.actions';
import {AddTaskRepeatCfgToTask, TaskRepeatCfgActionTypes} from '../../task-repeat-cfg/store/task-repeat-cfg.actions';

export const TASK_FEATURE_NAME = 'tasks';
export const taskAdapter: EntityAdapter<Task> = createEntityAdapter<Task>();

export interface TaskState extends EntityState<Task> {
  // overwrite entity model to avoid problems with typing
  ids: string[];

  // additional entities state properties
  currentTaskId: string | null;
  lastCurrentTaskId: string | null;
  focusTaskId: string | null;
  lastActiveFocusTaskId: string | null;

  // NOTE: but it is not needed currently
  todaysTaskIds: string[];
  backlogTaskIds: string[];
  stateBefore: TaskState;
  isDataLoaded: boolean;

  // TODO though this not so much maybe
  // todayDoneTasks: string[];
  // todayUnDoneTasks: string[];

  // TODO maybe rework time spent updates etc. via
  // BEWARE of the potential cleanup issues though
  // lastDeletedTasks: string[];
  // lastAffectedTasks: string[];
}


// REDUCER
// -------
export const initialTaskState: TaskState = taskAdapter.getInitialState({
  // overwrite entity model to avoid problems with typing
  ids: [],

  currentTaskId: null,
  lastCurrentTaskId: null,
  todaysTaskIds: [],
  backlogTaskIds: [],
  focusTaskId: null,
  lastActiveFocusTaskId: null,
  stateBefore: null,
  isDataLoaded: false,
});

// HELPER
// ------
const getTaskById = (taskId: string, state: TaskState) => {
  if (!state.entities[taskId]) {
    throw new Error('Task not found');
  } else {
    return state.entities[taskId];
  }
};

const filterOutId = (idToFilterOut) => (id) => id !== idToFilterOut;

const mapTaskWithSubTasksToTask = (task: TaskWithSubTasks): Task => {
  const copy = {...DEFAULT_TASK, ...task};
  delete copy.subTasks;
  delete copy.issueData;
  return copy;
};

export const filterStartableTasks = (s: TaskState): string[] => {
  return s.ids.filter((id) => {
    const t = s.entities[id];
    return !t.isDone && (
      (t.parentId)
        ? (s.todaysTaskIds.includes(t.parentId))
        : (s.todaysTaskIds.includes(id) && (!t.subTaskIds || t.subTaskIds.length === 0))
    );
  });
};

// SHARED REDUCER ACTIONS
// ----------------------
const reCalcTimesForParentIfParent = (parentId, state: TaskState): TaskState => {
  const stateWithTimeEstimate = reCalcTimeEstimateForParentIfParent(parentId, state);
  return reCalcTimeSpentForParentIfParent(parentId, stateWithTimeEstimate);
};

const reCalcTimeSpentForParentIfParent = (parentId, state: TaskState): TaskState => {
  if (parentId) {
    const parentTask: Task = getTaskById(parentId, state);
    const subTasks = parentTask.subTaskIds.map((id) => state.entities[id]);
    const timeSpentOnDayParent = {};

    subTasks.forEach((subTask) => {
      Object.keys(subTask.timeSpentOnDay).forEach(strDate => {
        if (subTask.timeSpentOnDay[strDate]) {
          if (!timeSpentOnDayParent[strDate]) {
            timeSpentOnDayParent[strDate] = 0;
          }
          timeSpentOnDayParent[strDate] += subTask.timeSpentOnDay[strDate];
        }
      });
    });
    return taskAdapter.updateOne({
      id: parentId,
      changes: {
        timeSpentOnDay: timeSpentOnDayParent,
        timeSpent: calcTotalTimeSpent(timeSpentOnDayParent),
      }
    }, state);
  } else {
    return state;
  }
};

const reCalcTimeEstimateForParentIfParent = (parentId, state: TaskState): TaskState => {
  if (parentId) {
    const parentTask: Task = state.entities[parentId];
    const subTasks = parentTask.subTaskIds.map((id) => state.entities[id]);

    return taskAdapter.updateOne({
      id: parentId,
      changes: {
        timeEstimate: subTasks.reduce((acc, task) => acc + task.timeEstimate, 0),
      }
    }, state);
  } else {
    return state;
  }
};

const updateTimeSpentForTask = (
  id: string,
  newTimeSpentOnDay: TimeSpentOnDay,
  state: TaskState,
): TaskState => {
  if (!newTimeSpentOnDay) {
    return state;
  }

  const task = getTaskById(id, state);
  const timeSpent = calcTotalTimeSpent(newTimeSpentOnDay);

  const stateAfterUpdate = taskAdapter.updateOne({
    id: id,
    changes: {
      timeSpentOnDay: newTimeSpentOnDay,
      timeSpent: timeSpent,
    }
  }, state);

  return task.parentId
    ? reCalcTimeSpentForParentIfParent(task.parentId, stateAfterUpdate)
    : stateAfterUpdate;
};

const updateTimeEstimateForTask = (
  taskId: string,
  newEstimate: number = null,
  state: TaskState,
): TaskState => {

  if (!newEstimate) {
    return state;
  }

  const task = getTaskById(taskId, state);
  const stateAfterUpdate = taskAdapter.updateOne({
    id: taskId,
    changes: {
      timeEstimate: newEstimate,
    }
  }, state);

  return task.parentId
    ? reCalcTimeEstimateForParentIfParent(task.parentId, stateAfterUpdate)
    : stateAfterUpdate;
};

const deleteTask = (state: TaskState,
                    taskToDelete: TaskWithSubTasks | Task): TaskState => {
  let stateCopy: TaskState = taskAdapter.removeOne(taskToDelete.id, state);

  let currentTaskId = (state.currentTaskId === taskToDelete.id) ? null : state.currentTaskId;

  // PARENT TASK side effects
  // also delete from parent task if any
  if (taskToDelete.parentId) {
    const parentTask = state.entities[taskToDelete.parentId];
    const isWasLastSubTask = (parentTask.subTaskIds.length === 1);
    stateCopy = taskAdapter.updateOne({
      id: taskToDelete.parentId,
      changes: {
        subTaskIds: stateCopy.entities[taskToDelete.parentId].subTaskIds
          .filter(filterOutId(taskToDelete.id)),

        // copy over sub task time stuff if it was the last sub task
        ...(
          (isWasLastSubTask)
            ? {
              timeSpentOnDay: taskToDelete.timeSpentOnDay,
              timeEstimate: taskToDelete.timeEstimate,
            }
            : {}
        )
      }
    }, stateCopy);
    // also update time spent for parent if it was not copied over from sub task
    if (!isWasLastSubTask) {
      stateCopy = reCalcTimeSpentForParentIfParent(taskToDelete.parentId, stateCopy);
      stateCopy = reCalcTimeEstimateForParentIfParent(taskToDelete.parentId, stateCopy);
    }
  }

  // SUB TASK side effects
  // also delete all sub tasks if any
  if (taskToDelete.subTaskIds) {
    stateCopy = taskAdapter.removeMany(taskToDelete.subTaskIds, stateCopy);
    // unset current if one of them is the current task
    currentTaskId = taskToDelete.subTaskIds.includes(currentTaskId) ? null : currentTaskId;
  }

  return {
    ...stateCopy,
    // finally delete from backlog or todays tasks
    backlogTaskIds: state.backlogTaskIds.filter(filterOutId(taskToDelete.id)),
    todaysTaskIds: state.todaysTaskIds.filter(filterOutId(taskToDelete.id)),
    currentTaskId,
    stateBefore: {...state, stateBefore: null}
  };
};


// TODO unit test the shit out of this once the model is settled
export function taskReducer(
  state: TaskState = initialTaskState,
  action: TaskActions | AddAttachment | DeleteAttachment | AddTaskRepeatCfgToTask
): TaskState {

  switch (action.type) {
    // Meta Actions
    // ------------
    case AttachmentActionTypes.AddAttachment: {
      const {taskId, id} = action.payload.attachment;
      const task = state.entities[taskId];
      return {
        ...state,
        entities:
          {
            ...state.entities,
            [taskId]: {
              ...task,
              attachmentIds: task.attachmentIds ? [...task.attachmentIds, (id as string)] : [id as string],
            }
          },
        focusTaskId: taskId
      };
    }

    case AttachmentActionTypes.DeleteAttachment: {
      const attachmentId = action.payload.id;
      const taskIds = state.ids as string[];
      const affectedTaskId = taskIds.find(
        id => state.entities[id].attachmentIds && state.entities[id].attachmentIds.includes(attachmentId)
      );
      const affectedTask = state.entities[affectedTaskId];
      return {
        ...state,
        entities:
          {
            ...state.entities,
            [affectedTaskId]: {
              ...affectedTask,
              attachmentIds: affectedTask.attachmentIds ? affectedTask.attachmentIds.filter(id_ => id_ !== attachmentId) : [],
            }
          },
        focusTaskId: affectedTaskId
      };
    }

    case TaskActionTypes.LoadTaskState: {
      const newState = action.payload.state;
      return {
        ...newState,
        currentTaskId: null,
        lastCurrentTaskId: newState.currentTaskId,
        isDataLoaded: true,
      };
    }

    case TaskActionTypes.StartFirstStartable: {
      const startableTasks = filterStartableTasks(state);
      return {
        ...state,
        currentTaskId: startableTasks && startableTasks[0] || null,
      };
    }

    case TaskActionTypes.SetCurrentTask: {
      if (action.payload) {
        const subTaskIds = state.entities[action.payload].subTaskIds;
        let taskToStartId = action.payload;
        if (subTaskIds && subTaskIds.length) {
          const undoneTasks = subTaskIds.map(id => state.entities[id]).filter(task => !task.isDone);
          taskToStartId = undoneTasks.length ? undoneTasks[0].id : subTaskIds[0];
        }
        return {
          ...(taskAdapter.updateOne({
            id: taskToStartId,
            changes: {isDone: false}
          }, state)),
          currentTaskId: taskToStartId,
        };
      } else {
        return {
          ...state,
          currentTaskId: action.payload,
        };
      }
    }

    case TaskActionTypes.UnsetCurrentTask: {
      return {...state, currentTaskId: null, lastCurrentTaskId: state.currentTaskId};
    }

    // Task Actions
    // ------------
    case TaskActionTypes.AddTask: {
      const task = {
        ...action.payload.task,
        timeSpent: calcTotalTimeSpent(action.payload.task.timeSpentOnDay),
      };

      return {
        ...taskAdapter.addOne(task, state),
        ...(
          action.payload.isAddToBacklog
            ? {
              backlogTaskIds: action.payload.isAddToBottom
                ? [
                  task.id,
                  ...state.backlogTaskIds
                ]
                : [
                  ...state.backlogTaskIds,
                  task.id,
                ]
            }
            : {
              todaysTaskIds: action.payload.isAddToBottom
                ? [
                  ...state.todaysTaskIds,
                  task.id,
                ]
                : [
                  task.id,
                  ...state.todaysTaskIds
                ]
            }
        ),
      };
    }

    case TaskActionTypes.UpdateTask: {
      let stateCopy = state;
      const id = action.payload.task.id as string;
      const {timeSpentOnDay, timeEstimate, isDone} = action.payload.task.changes;
      stateCopy = updateTimeSpentForTask(id, timeSpentOnDay, stateCopy);
      stateCopy = updateTimeEstimateForTask(id, timeEstimate, stateCopy);
      return taskAdapter.updateOne(action.payload.task, stateCopy);
    }

    case TaskActionTypes.UpdateTaskUi: {
      return taskAdapter.updateOne(action.payload.task, state);
    }

    // TODO simplify
    case TaskActionTypes.ToggleTaskShowSubTasks: {
      const {taskId, isShowLess, isEndless} = action.payload;
      const task = state.entities[taskId];
      const subTasks = task.subTaskIds.map(id => state.entities[id]);
      const doneTasksLength = subTasks.filter(t => t.isDone).length;
      const isDoneTaskCaseNeeded = doneTasksLength && (doneTasksLength < subTasks.length);
      const oldVal = +task._showSubTasksMode;
      let newVal;

      if (isDoneTaskCaseNeeded) {
        newVal = oldVal + (isShowLess ? -1 : 1);
        if (isEndless) {
          if (newVal > ShowSubTasksMode.Show) {
            newVal = ShowSubTasksMode.HideAll;
          } else if (newVal < ShowSubTasksMode.HideAll) {
            newVal = ShowSubTasksMode.Show;
          }
        } else {
          if (newVal > ShowSubTasksMode.Show) {
            newVal = ShowSubTasksMode.Show;
          }
          if (newVal < ShowSubTasksMode.HideAll) {
            newVal = ShowSubTasksMode.HideAll;
          }
        }

      } else {
        if (isEndless) {
          if (oldVal === ShowSubTasksMode.Show) {
            newVal = ShowSubTasksMode.HideAll;
          }
          if (oldVal !== ShowSubTasksMode.Show) {
            newVal = ShowSubTasksMode.Show;
          }
        } else {
          newVal = (isShowLess)
            ? ShowSubTasksMode.HideAll
            : ShowSubTasksMode.Show;
        }
      }

      // failsafe
      newVal = (isNaN(newVal)) ? ShowSubTasksMode.HideAll : newVal;

      return taskAdapter.updateOne({
        id: taskId,
        changes: {
          _showSubTasksMode: newVal
        }
      }, state);
    }

    // TODO also delete related issue :(
    case TaskActionTypes.DeleteTask: {
      return deleteTask(state, action.payload.task);
    }

    case TaskActionTypes.UndoDeleteTask: {
      return state.stateBefore || state;
    }

    case TaskActionTypes.Move: {
      let newState = state;
      const {taskId, sourceModelId, targetModelId, newOrderedIds} = action.payload;
      const taskToMove = state.entities[taskId];


      switch (sourceModelId) {
        case 'DONE':
        case 'UNDONE':
          newState = {
            ...newState,
            todaysTaskIds: newState.todaysTaskIds.filter(filterOutId(taskId)),
          };
          break;

        case 'BACKLOG':
          newState = {
            ...newState,
            backlogTaskIds: newState.backlogTaskIds.filter(filterOutId(taskId)),
          };
          break;

        default:
          // SUB TASK CASE
          const oldPar = state.entities[sourceModelId];

          newState = reCalcTimesForParentIfParent(oldPar.id, {
            ...newState,
            entities: {
              ...newState.entities,
              [oldPar.id]: {
                ...oldPar,
                subTaskIds: oldPar.subTaskIds.filter(filterOutId(taskId))
              }
            }
          });
      }

      switch (targetModelId) {
        case 'DONE':
        case 'UNDONE':
          let newIndex;
          const curInUpdateListIndex = newOrderedIds.indexOf(taskId);
          const prevItemId = newOrderedIds[curInUpdateListIndex - 1];
          const nextItemId = newOrderedIds[curInUpdateListIndex + 1];

          if (prevItemId) {
            newIndex = newState.todaysTaskIds.indexOf(prevItemId) + 1;
          } else if (nextItemId) {
            newIndex = newState.todaysTaskIds.indexOf(nextItemId);
          } else if (targetModelId === 'DONE') {
            newIndex = newState.todaysTaskIds.length;
          } else if (targetModelId === 'UNDONE') {
            newIndex = 0;
          }
          const isDone = (targetModelId === 'DONE');
          const newIds = [...newState.todaysTaskIds];
          newIds.splice(newIndex, 0, taskId);
          return {
            ...newState,
            todaysTaskIds: newIds,
            entities: {
              ...newState.entities,
              [taskId]: {
                ...taskToMove,
                isDone
              }
            },
            // unset current task if it was the task moved
            ...((isDone && taskId === state.currentTaskId) ? {currentTaskId: null} : {})
          };

        case 'BACKLOG':
          return {
            ...newState,
            backlogTaskIds: newOrderedIds,
          };

        default:
          // SUB TASK CASE
          const newPar = state.entities[targetModelId];
          return reCalcTimesForParentIfParent(newPar.id, {
            ...newState,
            entities: {
              ...newState.entities,
              [newPar.id]: {
                ...newPar,
                subTaskIds: newOrderedIds
              },
              [taskId]: {
                ...taskToMove,
                parentId: newPar.id
              },
            }
          });
      }
    }

    case TaskActionTypes.MoveUp: {
      let updatedState = state;
      const {id} = action.payload;
      const taskToMove = state.entities[id];
      if (taskToMove.parentId) {
        const parentSubTasks = state.entities[taskToMove.parentId].subTaskIds;
        updatedState = taskAdapter.updateOne({
          id: taskToMove.parentId,
          changes: {
            subTaskIds: arrayMoveLeft(parentSubTasks, id)
          }
        }, updatedState);
      }

      return {
        ...updatedState,
        ids: arrayMoveLeft(state.ids, id),
        backlogTaskIds: arrayMoveLeft(state.backlogTaskIds, id),
        todaysTaskIds: arrayMoveLeft(state.todaysTaskIds, id),
      };
    }


    case TaskActionTypes.MoveDown: {
      let updatedState = state;
      const id = action.payload.id;
      const taskToMove = state.entities[id];
      if (taskToMove.parentId) {
        const parentSubTasks = state.entities[taskToMove.parentId].subTaskIds;
        updatedState = taskAdapter.updateOne({
          id: taskToMove.parentId,
          changes: {
            subTaskIds: arrayMoveRight(parentSubTasks, id)
          }
        }, updatedState);
      }

      return {
        ...updatedState,
        ids: arrayMoveRight(state.ids, id),
        backlogTaskIds: arrayMoveRight(state.backlogTaskIds, id),
        todaysTaskIds: arrayMoveRight(state.todaysTaskIds, id),
      };
    }


    case TaskActionTypes.AddTimeSpent: {
      const {id, date, duration} = action.payload;
      const task = getTaskById(id, state);
      const currentTimeSpentForTickDay = task.timeSpentOnDay && +task.timeSpentOnDay[date] || 0;

      return updateTimeSpentForTask(
        id, {
          ...task.timeSpentOnDay,
          [date]: (currentTimeSpentForTickDay + duration)
        },
        state
      );
    }

    case TaskActionTypes.RemoveTimeSpent: {
      const {id, date, duration} = action.payload;
      const task = getTaskById(id, state);
      const currentTimeSpentForTickDay = task.timeSpentOnDay && +task.timeSpentOnDay[date] || 0;

      return updateTimeSpentForTask(
        id, {
          ...task.timeSpentOnDay,
          [date]: Math.max((currentTimeSpentForTickDay - duration), 0)
        },
        state
      );
    }

    case TaskActionTypes.FocusLastActiveTask: {
      return {
        ...state,
        focusTaskId: state.lastActiveFocusTaskId,
        lastActiveFocusTaskId: state.lastActiveFocusTaskId,
      };
    }

    case TaskActionTypes.RestoreTask: {
      const task = {...action.payload.task, isDone: false};
      const tasksToAdd = [mapTaskWithSubTasksToTask(task)];

      if (task.subTasks) {
        task.subTasks.forEach((subTask: TaskWithSubTasks) => {
          if (subTask && subTask.id) {
            tasksToAdd.push(mapTaskWithSubTasksToTask(subTask));
          }
        });
      }
      return {
        ...taskAdapter.addMany(tasksToAdd, state),
        todaysTaskIds: [
          task.id,
          ...state.todaysTaskIds
        ]
      };
    }

    case TaskActionTypes.FocusTask: {
      return {
        ...state,
        focusTaskId: action.payload.id,
        lastActiveFocusTaskId: state.focusTaskId || state.lastActiveFocusTaskId,
      };
    }

    case TaskActionTypes.AddSubTask: {
      const {task, parentId} = action.payload;
      const parentTask = state.entities[parentId];

      // add item1
      const stateCopy = taskAdapter.addOne({
        ...task,
        parentId: parentId,
        // update timeSpent if first sub task and non present
        ...(
          (parentTask.subTaskIds.length === 0 && Object.keys(task.timeSpentOnDay).length === 0)
            ? {
              timeSpentOnDay: parentTask.timeSpentOnDay,
              timeSpent: calcTotalTimeSpent(parentTask.timeSpentOnDay)
            }
            : {}
        ),
        // update timeEstimate if first sub task and non present
        ...(
          (parentTask.subTaskIds.length === 0 && !task.timeEstimate)
            ? {timeEstimate: parentTask.timeEstimate}
            : {}
        )
      }, state);

      return {
        ...stateCopy,
        // focus new task
        focusTaskId: task.id,
        // update current task to new sub task if parent was current before
        ...(
          (state.currentTaskId === parentId)
            ? {currentTaskId: task.id}
            : {}
        ),
        // also add to parent task
        entities: {
          ...stateCopy.entities,
          [parentId]: {
            ...parentTask,
            subTaskIds: [...parentTask.subTaskIds, task.id]
          }
        }
      };
    }

    case TaskActionTypes.MoveToToday: {
      if (state.todaysTaskIds.includes(action.payload.id)) {
        return state;
      }

      const task = state.entities[action.payload.id];
      if (!task || task.parentId) {
        console.error('Trying to move sub task to todays list. This should not happen');
        return state;
      }

      return {
        ...state,
        backlogTaskIds: state.backlogTaskIds.filter(filterOutId(action.payload.id)),
        todaysTaskIds: action.payload.isMoveToTop
          ? [action.payload.id, ...state.todaysTaskIds]
          : [...state.todaysTaskIds, action.payload.id]
      };
    }

    case TaskActionTypes.MoveToBacklog: {
      if (state.backlogTaskIds.includes(action.payload.id)) {
        return state;
      }

      return {
        ...state,
        todaysTaskIds: state.todaysTaskIds.filter(filterOutId(action.payload.id)),
        backlogTaskIds: [action.payload.id, ...state.backlogTaskIds],
      };
    }

    case TaskActionTypes.MoveToOtherProject:
    case TaskActionTypes.MoveToArchive: {
      let copyState = state;
      action.payload.tasks.forEach((task) => {
        copyState = deleteTask(copyState, task);
      });
      return {
        ...copyState
      };
    }

    case TaskActionTypes.ToggleStart: {
      if (state.currentTaskId) {
        return {
          ...state,
          lastCurrentTaskId: state.currentTaskId,
        };
      }
      return state;
    }

    case TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask: {
      return taskAdapter.updateOne({
        id: action.payload.taskId,
        changes: {
          repeatCfgId: action.payload.taskRepeatCfg.id
        }
      }, state);
    }

    default: {
      return state;
    }
  }
}
