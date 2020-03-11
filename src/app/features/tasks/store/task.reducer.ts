import {TaskActions, TaskActionTypes} from './task.actions';
import {ShowSubTasksMode, TaskAdditionalInfoTargetPanel, TaskState, TaskWithSubTasks} from '../task.model';
import {calcTotalTimeSpent} from '../util/calc-total-time-spent';
import {arrayMoveLeft, arrayMoveRight} from '../../../util/array-move';
import {AddAttachment, AttachmentActionTypes, DeleteAttachment} from '../../attachment/store/attachment.actions';
import {AddTaskRepeatCfgToTask, TaskRepeatCfgActionTypes} from '../../task-repeat-cfg/store/task-repeat-cfg.actions';
import {
  deleteTask,
  filterOutId,
  filterStartableTasks,
  getTaskById,
  mapTaskWithSubTasksToTask,
  moveItemInList,
  reCalcTimesForParentIfParent,
  updateTimeEstimateForTask,
  updateTimeSpentForTask
} from './task.reducer.util';
import {taskAdapter} from './task.adapter';

export const TASK_FEATURE_NAME = 'tasks';


// REDUCER
// -------
export const initialTaskState: TaskState = taskAdapter.getInitialState({
  // overwrite entity model to avoid problems with typing
  ids: [],

  currentTaskId: null,
  selectedTaskId: null,
  taskAdditionalInfoTargetPanel: TaskAdditionalInfoTargetPanel.Default,
  lastCurrentTaskId: null,
  todaysTaskIds: [],
  backlogTaskIds: [],
  stateBefore: null,
  isDataLoaded: false,
}) as TaskState;


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
              attachmentIds: affectedTask.attachmentIds ? affectedTask.attachmentIds.filter(idIN => idIN !== attachmentId) : [],
            }
          },
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


    case TaskActionTypes.UpdateTaskListIds: {
      const {todaysTaskIds, backlogTaskIds} = action.payload;

      return {
        ...state,
        backlogTaskIds,
        todaysTaskIds,
      };
    }

    case TaskActionTypes.StartFirstStartable: {
      if (!action.payload.isStartIfHasCurrent && state.currentTaskId) {
        return state;
      }

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
          selectedTaskId: state.selectedTaskId && taskToStartId,
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

    case TaskActionTypes.SetSelectedTask: {
      const {id, taskAdditionalInfoTargetPanel} = action.payload;
      return {
        ...state,
        taskAdditionalInfoTargetPanel: (id === state.selectedTaskId) ? null : taskAdditionalInfoTargetPanel,
        selectedTaskId: (id === state.selectedTaskId) ? null : id,
      };
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

    case TaskActionTypes.UpdateTaskTags: {
      return taskAdapter.updateOne({
        id: action.payload.taskId,
        changes: {
          tagIds: action.payload.newTagIds,
        }
      }, state);
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
          const isDone = (targetModelId === 'DONE');
          // NOTE: move to end of complete list for done tasks
          const emptyListVal = (targetModelId === 'DONE')
            ? newState.todaysTaskIds.length
            : 0;
          return {
            ...newState,
            todaysTaskIds: moveItemInList(taskId, newState.todaysTaskIds, newOrderedIds, emptyListVal),
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
                subTaskIds: moveItemInList(taskId, newPar.subTaskIds, newOrderedIds),
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

    case TaskActionTypes.RestoreTask: {
      const task = {...action.payload.task, isDone: false};
      const subTasks = action.payload.subTasks;
      const tasksToAdd = [mapTaskWithSubTasksToTask(task)];

      if (subTasks && subTasks.length) {
        subTasks.forEach((subTask: TaskWithSubTasks) => {
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

    case TaskActionTypes.AddSubTask: {
      const {task, parentId} = action.payload;
      const parentTask = state.entities[parentId];

      // add item1
      const stateCopy = taskAdapter.addOne({
        ...task,
        parentId,
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
