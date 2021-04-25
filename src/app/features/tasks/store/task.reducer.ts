import {
  AddSubTask,
  AddTask,
  ScheduleTask,
  AddTimeSpent,
  ConvertToMainTask,
  DeleteMainTasks,
  DeleteTask,
  MoveSubTask,
  MoveSubTaskDown,
  MoveSubTaskUp,
  MoveToArchive,
  MoveToOtherProject,
  RemoveTagsForAllTasks,
  UnScheduleTask,
  RemoveTimeSpent,
  RestoreTask,
  RoundTimeSpentForDay,
  ReScheduleTask,
  SetCurrentTask,
  SetSelectedTask,
  TaskActions,
  TaskActionTypes,
  ToggleTaskShowSubTasks,
  UpdateTask,
  UpdateTaskTags,
  UpdateTaskUi
} from './task.actions';
import { ShowSubTasksMode, Task, TaskAdditionalInfoTargetPanel, TaskState } from '../task.model';
import { calcTotalTimeSpent } from '../util/calc-total-time-spent';
import { AddTaskRepeatCfgToTask, TaskRepeatCfgActionTypes } from '../../task-repeat-cfg/store/task-repeat-cfg.actions';
import {
  deleteTask,
  getTaskById,
  reCalcTimesForParentIfParent,
  reCalcTimeSpentForParentIfParent,
  removeTaskFromParentSideEffects,
  updateDoneOnForTask,
  updateTimeEstimateForTask,
  updateTimeSpentForTask
} from './task.reducer.util';
import { taskAdapter } from './task.adapter';
import { moveItemInList } from '../../work-context/store/work-context-meta.helper';
import { arrayMoveLeft, arrayMoveRight } from '../../../util/array-move';
import { filterOutId } from '../../../util/filter-out-id';
import {
  AddTaskAttachment,
  DeleteTaskAttachment,
  TaskAttachmentActions,
  TaskAttachmentActionTypes,
  UpdateTaskAttachment
} from '../task-attachment/task-attachment.actions';
import { Update } from '@ngrx/entity';
import { unique } from '../../../util/unique';
import { roundDurationVanilla } from '../../../util/round-duration';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../../../imex/sync/sync.model';
import { migrateTaskState } from '../migrate-task-state.util';
import { environment } from '../../../../environments/environment';

export const TASK_FEATURE_NAME = 'tasks';

// REDUCER
// -------
export const initialTaskState: TaskState = taskAdapter.getInitialState({
  // overwrite entity model to avoid problems with typing
  ids: [],

  // TODO maybe at least move those properties to an ui property
  currentTaskId: null,
  selectedTaskId: null,
  taskAdditionalInfoTargetPanel: TaskAdditionalInfoTargetPanel.Default,
  lastCurrentTaskId: null,
  isDataLoaded: false,
}) as TaskState;

// TODO unit test the shit out of this once the model is settled
export function taskReducer(
  state: TaskState = initialTaskState,
  action: TaskActions | AddTaskRepeatCfgToTask | TaskAttachmentActions
): TaskState {
  if (environment.production) {
    console.log(action.type, (action as any)?.payload || action, state);
  }

  // TODO fix this hackyness once we use the new syntax everywhere
  if ((action.type as string) === loadAllData.type) {
    const {appDataComplete}: { appDataComplete: AppDataComplete } = action as any;
    return appDataComplete.task
      ? migrateTaskState({
        ...appDataComplete.task,
        currentTaskId: null,
        lastCurrentTaskId: appDataComplete.task.currentTaskId,
        isDataLoaded: true,
      }) :
      state;
  }

  switch (action.type) {
    case TaskActionTypes.SetCurrentTask: {
      const a: SetCurrentTask = action as SetCurrentTask;
      if (a.payload) {
        const task = state.entities[a.payload] as Task;
        const subTaskIds = task.subTaskIds;
        let taskToStartId = a.payload;
        if (subTaskIds && subTaskIds.length) {
          const undoneTasks = subTaskIds
            .map(id => state.entities[id] as Task)
            .filter((ta: Task) => !ta.isDone);
          taskToStartId = undoneTasks.length
            ? undoneTasks[0].id
            : subTaskIds[0];
        }
        return {
          ...(taskAdapter.updateOne({
            id: taskToStartId,
            changes: {isDone: false, doneOn: null}
          }, state)),
          currentTaskId: taskToStartId,
          selectedTaskId: state.selectedTaskId && taskToStartId,
        };
      } else {
        return {
          ...state,
          currentTaskId: a.payload,
        };
      }
    }

    case TaskActionTypes.UnsetCurrentTask: {
      return {...state, currentTaskId: null, lastCurrentTaskId: state.currentTaskId};
    }

    case TaskActionTypes.SetSelectedTask: {
      const {id, taskAdditionalInfoTargetPanel} = (action as SetSelectedTask).payload;
      return {
        ...state,
        taskAdditionalInfoTargetPanel: (!id || (id === state.selectedTaskId))
          ? null
          : taskAdditionalInfoTargetPanel || null,
        selectedTaskId: (id === state.selectedTaskId)
          ? null
          : id,
      };
    }

    // Task Actions
    // ------------
    case TaskActionTypes.AddTask: {
      const task = {
        ...(action as AddTask).payload.task,
        timeSpent: calcTotalTimeSpent((action as AddTask).payload.task.timeSpentOnDay),
      };
      return taskAdapter.addOne(task, state);
    }

    case TaskActionTypes.UpdateTask: {
      let stateCopy = state;
      const a: UpdateTask = action as UpdateTask;
      const id = a.payload.task.id as string;
      const {timeSpentOnDay, timeEstimate} = a.payload.task.changes;
      stateCopy = timeSpentOnDay
        ? updateTimeSpentForTask(id, timeSpentOnDay, stateCopy)
        : stateCopy;
      stateCopy = updateTimeEstimateForTask(id, timeEstimate, stateCopy);
      stateCopy = updateDoneOnForTask(a.payload.task, stateCopy);
      return taskAdapter.updateOne(a.payload.task, stateCopy);
    }

    case TaskActionTypes.UpdateTaskUi: {
      return taskAdapter.updateOne((action as UpdateTaskUi).payload.task, state);
    }

    case TaskActionTypes.UpdateTaskTags: {
      const {task, newTagIds} = (action as UpdateTaskTags).payload;
      return taskAdapter.updateOne({
        id: task.id,
        changes: {
          tagIds: newTagIds,
        }
      }, state);
    }

    case TaskActionTypes.RemoveTagsForAllTasks: {
      const updates: Update<Task>[] = state.ids.map((taskId) => ({
        id: taskId,
        changes: {
          tagIds: (state.entities[taskId] as Task).tagIds.filter(
            tagId => !(action as RemoveTagsForAllTasks).payload.tagIdsToRemove.includes(tagId)
          ),
        }
      }));
      return taskAdapter.updateMany(updates, state);
    }

    // TODO simplify
    case TaskActionTypes.ToggleTaskShowSubTasks: {
      const {taskId, isShowLess, isEndless} = (action as ToggleTaskShowSubTasks).payload;
      const task = (state.entities[taskId] as Task);
      const subTasks = task.subTaskIds.map(id => state.entities[id] as Task);
      const doneTasksLength = subTasks.filter((t) => t.isDone).length;
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
      newVal = (isNaN(newVal as any))
        ? ShowSubTasksMode.HideAll
        : newVal;

      return taskAdapter.updateOne({
        id: taskId,
        changes: {
          _showSubTasksMode: newVal
        }
      }, state);
    }

    case TaskActionTypes.DeleteTask: {
      return deleteTask(state, (action as DeleteTask).payload.task);
    }

    case TaskActionTypes.DeleteMainTasks: {
      const allIds = (action as DeleteMainTasks).payload.taskIds.reduce((acc: string[], id: string) => {
        return [
          ...acc,
          id,
          ...(state.entities[id] as Task).subTaskIds
        ];
      }, []);
      return taskAdapter.removeMany(allIds, state);
    }

    case TaskActionTypes.MoveSubTask: {
      let newState = state;
      const {taskId, srcTaskId, targetTaskId, newOrderedIds} = (action as MoveSubTask).payload;
      const oldPar = state.entities[srcTaskId] as Task;
      const newPar = state.entities[targetTaskId] as Task;

      // for old parent remove
      newState = taskAdapter.updateOne({
        id: oldPar.id,
        changes: {
          subTaskIds: oldPar.subTaskIds.filter(filterOutId(taskId))
        }
      }, newState);
      newState = reCalcTimesForParentIfParent(oldPar.id, newState);

      // for new parent add and move
      newState = taskAdapter.updateOne({
        id: newPar.id,
        changes: {
          subTaskIds: moveItemInList(taskId, newPar.subTaskIds, newOrderedIds),
        }
      }, newState);
      newState = reCalcTimesForParentIfParent(newPar.id, newState);

      // change parent id for moving task
      newState = taskAdapter.updateOne({
        id: taskId,
        changes: {
          parentId: newPar.id,
          projectId: newPar.projectId,
        }
      }, newState);

      return newState;
    }

    case TaskActionTypes.MoveSubTaskUp: {
      const {id, parentId} = (action as MoveSubTaskUp).payload;
      const parentSubTaskIds = (state.entities[parentId] as Task).subTaskIds;
      return taskAdapter.updateOne({
        id: parentId,
        changes: {
          subTaskIds: arrayMoveLeft(parentSubTaskIds, id)
        }
      }, state);
    }

    case TaskActionTypes.MoveSubTaskDown: {
      const {id, parentId} = (action as MoveSubTaskDown).payload;
      const parentSubTaskIds = (state.entities[parentId] as Task).subTaskIds;
      return taskAdapter.updateOne({
        id: parentId,
        changes: {
          subTaskIds: arrayMoveRight(parentSubTaskIds, id)
        }
      }, state);
    }

    case TaskActionTypes.AddTimeSpent: {
      const {task, date, duration} = (action as AddTimeSpent).payload;
      const currentTimeSpentForTickDay = task.timeSpentOnDay && +task.timeSpentOnDay[date] || 0;

      return updateTimeSpentForTask(
        task.id, {
          ...task.timeSpentOnDay,
          [date]: (currentTimeSpentForTickDay + duration)
        },
        state
      );
    }

    case TaskActionTypes.RemoveTimeSpent: {
      const {id, date, duration} = (action as RemoveTimeSpent).payload;
      const task = getTaskById(id, state) as Task;
      const currentTimeSpentForTickDay = task.timeSpentOnDay && +task.timeSpentOnDay[date] || 0;

      return updateTimeSpentForTask(
        id, {
          ...task.timeSpentOnDay,
          [date]: Math.max((currentTimeSpentForTickDay - duration), 0)
        },
        state
      );
    }

    case TaskActionTypes.AddSubTask: {
      const {task, parentId} = (action as AddSubTask).payload;
      const parentTask = state.entities[parentId] as Task;

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
        ),
        // should always be empty
        tagIds: [],
        // should always be the one of the parent
        projectId: parentTask.projectId
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

    case TaskActionTypes.ConvertToMainTask: {
      const {task} = (action as ConvertToMainTask).payload;
      const par = state.entities[task.parentId as string];
      if (!par) {
        throw new Error('No parent for sub task');
      }

      const stateCopy = removeTaskFromParentSideEffects(state, task);
      return taskAdapter.updateOne({
        id: task.id,
        changes: {
          parentId: null,
          tagIds: [...par.tagIds],
        }
      }, stateCopy);
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

    case TaskActionTypes.MoveToOtherProject: {
      const {targetProjectId, task} = (action as MoveToOtherProject).payload;
      const updates: Update<Task>[] = [task.id, ...task.subTaskIds].map(id => ({
        id,
        changes: {
          projectId: targetProjectId
        }
      }));
      return taskAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.RoundTimeSpentForDay: {
      const {day, taskIds, isRoundUp, roundTo, projectId} = (action as RoundTimeSpentForDay).payload;
      const isLimitToProject: boolean = !!projectId || projectId === null;

      const idsToUpdateDirectly: string[] = taskIds.filter(id => {
          const task: Task = state.entities[id] as Task;
          return (task.subTaskIds.length === 0 || !!task.parentId)
            && (!isLimitToProject || task.projectId === projectId);
        }
      );
      const subTaskIds: string[] = idsToUpdateDirectly.filter(id => !!(state.entities[id] as Task).parentId);
      const parentTaskToReCalcIds: string[] = unique<string>(subTaskIds
        .map(id => (state.entities[id] as Task).parentId as string)
      );

      const updateSubsAndMainWithoutSubs: Update<Task>[] = idsToUpdateDirectly.map(id => {
        const spentOnDayBefore = (state.entities[id] as Task).timeSpentOnDay;
        const timeSpentOnDayUpdated = {
          ...spentOnDayBefore,
          [day]: roundDurationVanilla(spentOnDayBefore[day], roundTo, isRoundUp)
        };
        return {
          id,
          changes: {
            timeSpentOnDay: timeSpentOnDayUpdated,
            timeSpent: calcTotalTimeSpent(timeSpentOnDayUpdated),
          }
        };
      });

      // // update subs
      const newState = taskAdapter.updateMany(updateSubsAndMainWithoutSubs, state);
      // reCalc parents
      return parentTaskToReCalcIds.reduce((acc, parentId) =>
        reCalcTimeSpentForParentIfParent(parentId, acc), newState);
    }


    // TASK ARCHIVE STUFF
    // ------------------
    // TODO fix
    case TaskActionTypes.MoveToArchive: {
      let copyState = state;
      (action as MoveToArchive).payload.tasks.forEach((task) => {
        copyState = deleteTask(copyState, task);
      });
      return {
        ...copyState
      };
    }

    case TaskActionTypes.RestoreTask: {
      const task = {...(action as RestoreTask).payload.task, isDone: false, doneOn: null};
      const subTasks = (action as RestoreTask).payload.subTasks || [];
      return taskAdapter.addMany([task, ...subTasks], state);
    }

    // REPEAT STUFF
    // ------------
    case TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask: {
      return taskAdapter.updateOne({
        id: (action as AddTaskRepeatCfgToTask).payload.taskId,
        changes: {
          repeatCfgId: (action as AddTaskRepeatCfgToTask).payload.taskRepeatCfg.id
        }
      }, state);
    }


    // TASK ATTACHMENTS
    // ----------------
    case TaskAttachmentActionTypes.AddTaskAttachment: {
      const {taskId, taskAttachment} = (action as AddTaskAttachment).payload;
      return taskAdapter.updateOne({
        id: taskId,
        changes: {
          attachments: [
            ...(state.entities[taskId] as Task).attachments, taskAttachment
          ]
        }
      }, state);
    }

    case TaskAttachmentActionTypes.UpdateTaskAttachment: {
      const {taskId, taskAttachment} = (action as UpdateTaskAttachment).payload;
      const attachments = (state.entities[taskId] as Task).attachments;
      const updatedAttachments = attachments.map(
        attachment => attachment.id === taskAttachment.id
          ? ({
            ...attachment,
            ...taskAttachment.changes
          })
          : attachment
      );

      return taskAdapter.updateOne({
        id: taskId,
        changes: {
          attachments: updatedAttachments,
        }
      }, state);
    }

    case TaskAttachmentActionTypes.DeleteTaskAttachment: {
      const {taskId, id} = (action as DeleteTaskAttachment).payload;
      return taskAdapter.updateOne({
        id: taskId,
        changes: {
          attachments: (state.entities[taskId] as Task).attachments.filter(at => at.id !== id)
        }
      }, state);
    }

    // REMINDER STUFF
    // --------------
    case TaskActionTypes.ScheduleTask: {
      const {task, remindAt} = (action as ScheduleTask).payload;
      return taskAdapter.updateOne({
        id: task.id,
        changes: {
          plannedAt: remindAt,
        }
      }, state);
    }

    case TaskActionTypes.ReScheduleTask: {
      const {id, plannedAt} = (action as ReScheduleTask).payload;
      return taskAdapter.updateOne({
        id,
        changes: {
          plannedAt,
        }
      }, state);
    }

    case TaskActionTypes.UnScheduleTask: {
      const {id} = (action as UnScheduleTask).payload;
      return taskAdapter.updateOne({
        id,
        changes: {
          plannedAt: null,
        }
      }, state);
    }

    default: {
      return state;
    }
  }
}
