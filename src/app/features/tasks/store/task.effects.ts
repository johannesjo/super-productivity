import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { DeleteTask, Move, MoveToBacklog, SetCurrentTask, TaskActionTypes, UpdateTask } from './task.actions';
import { select, Store } from '@ngrx/store';
import { filter, map, mergeMap, tap, throttleTime, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectCurrentTask, selectTaskFeatureState } from './task.selectors';
import { selectCurrentProjectId } from '../../project/store/project.reducer';
import { SnackOpen } from '../../../core/snack/store/snack.actions';
import { NotifyService } from '../../../core/notify/notify.service';
import { TaskService } from '../task.service';
import { selectConfigFeatureState, selectMiscConfig } from '../../config/store/config.reducer';
import { AttachmentActionTypes } from '../../attachment/store/attachment.actions';
import { TaskWithSubTasks } from '../task.model';
import { TaskState } from './task.reducer';
import { EMPTY, of } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { IPC_CURRENT_TASK_UPDATED } from '../../../../../electron/ipc-events.const';
import { IS_ELECTRON } from '../../../app.constants';
import { ReminderService } from '../../reminder/reminder.service';
import { MiscConfig } from '../../config/config.model';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskEffects {
  @Effect({dispatch: false}) moveToArchive$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.MoveToArchive,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
      ),
      tap(this._moveToArchive.bind(this)),
      tap(this._updateLastActive.bind(this)),
    );


  @Effect({dispatch: false}) updateTask$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.AddTimeSpent,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.UndoDeleteTask,
        TaskActionTypes.AddSubTask,
        TaskActionTypes.SetCurrentTask,
        TaskActionTypes.StartFirstStartable,
        TaskActionTypes.UnsetCurrentTask,
        TaskActionTypes.UpdateTask,
        TaskActionTypes.Move,
        TaskActionTypes.MoveToArchive,
        TaskActionTypes.MoveToBacklog,
        TaskActionTypes.MoveToToday,
        TaskActionTypes.ToggleStart,

        AttachmentActionTypes.DeleteAttachment,
        AttachmentActionTypes.AddAttachment,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(this._saveToLs.bind(this)),
      tap(this._updateLastActive.bind(this)),
    );

  @Effect({dispatch: false}) updateTaskUi$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTaskUi,
        TaskActionTypes.ToggleTaskShowSubTasks,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect() snackDelete$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.DeleteTask,
      ),
      map((action_: DeleteTask) => {
        const action = action_ as DeleteTask;
        return new SnackOpen({
          message: `Deleted task "${action.payload.task.title}"`,
          config: {duration: 5000},
          actionStr: 'Undo',
          actionId: TaskActionTypes.UndoDeleteTask
        });
      })
    );

  @Effect({dispatch: false}) clearReminders: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.DeleteTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      map(([a, state]) => {
        const ids = state.ids as string[];
        const idsBefore = state.stateBefore.ids as string[];
        const deletedTaskIds = idsBefore.filter((id) => !ids.includes(id));
        const deletedTasks = deletedTaskIds.map(id => state.stateBefore.entities[id]);
        const deletedReminderTasks = deletedTasks.filter(task => task.reminderId);
        deletedReminderTasks.forEach((task) => {
          this._reminderService.removeReminder(task.reminderId);
        });
      })
    );

  @Effect({dispatch: false}) timeEstimateExceeded$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTimeSpent,
      ),
      // show every 1 minute max
      throttleTime(60000),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentTask)),
        this._store$.pipe(select(selectConfigFeatureState)),
      ),
      tap(this._notifyAboutTimeEstimateExceeded.bind(this))
    );

  @Effect({dispatch: false}) taskChangeElectron$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.SetCurrentTask,
        TaskActionTypes.StartFirstStartable,
      ),
      withLatestFrom(this._store$.pipe(select(selectCurrentTask))),
      tap(([action, current]) => {
        if (IS_ELECTRON) {
          this._electronService.ipcRenderer.send(IPC_CURRENT_TASK_UPDATED, {current});
        }
      })
    );

  @Effect() onAllSubTasksDone$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectMiscConfig)),
        this._store$.pipe(select(selectTaskFeatureState))
      ),
      filter(([action, miscCfg, state]: [UpdateTask, MiscConfig, TaskState]) =>
        miscCfg && miscCfg.isAutMarkParentAsDone &&
        action.payload.task.changes.isDone &&
        !!(state.entities[action.payload.task.id].parentId)
      ),
      filter(([action, miscCfg, state]) => {
        const task = state.entities[action.payload.task.id];
        const parent = state.entities[task.parentId];
        const undoneSubTasks = parent.subTaskIds.filter(id => !state.entities[id].isDone);
        return undoneSubTasks.length === 0;
      }),
      map(([action, miscCfg, state]) => new UpdateTask({
        task: {
          id: state.entities[action.payload.task.id].parentId,
          changes: {isDone: true},
        }
      })),
    );


  @Effect({dispatch: false}) restoreTask$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.RestoreTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
      ),
      tap(this._removeFromArchive.bind(this))
    );

  @Effect() autoSetNextTask$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.ToggleStart,
        TaskActionTypes.UpdateTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.MoveToBacklog,
        TaskActionTypes.MoveToArchive,
        TaskActionTypes.Move,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
        (action, state) => ({action, state})
      ),
      mergeMap(({action, state}) => {
        const currentId = state.currentTaskId;
        let nextId: 'NO_UPDATE' | string | null;

        switch (action.type) {
          case TaskActionTypes.ToggleStart: {
            nextId = state.currentTaskId ? null : this.findNextTask(state);
            break;
          }

          case TaskActionTypes.UpdateTask: {
            const {isDone} = (<UpdateTask>action).payload.task.changes;
            const oldId = (<UpdateTask>action).payload.task.id;
            const isCurrent = (oldId === currentId);
            nextId = (isDone && isCurrent) ? this.findNextTask(state, oldId) : 'NO_UPDATE';
            break;
          }

          case TaskActionTypes.MoveToBacklog: {
            const isCurrent = (currentId === (<MoveToBacklog>action).payload.id);
            nextId = (isCurrent) ? null : 'NO_UPDATE';
            break;
          }

          case TaskActionTypes.Move: {
            const isCurrent = (currentId === (<Move>action).payload.taskId);
            const isMovedToBacklog = ((<Move>action).payload.targetModelId === 'BACKLOG');
            nextId = (isCurrent && isMovedToBacklog) ? null : 'NO_UPDATE';
            break;
          }

          // QUICK FIX FOR THE ISSUE
          // TODO better solution
          case TaskActionTypes.DeleteTask: {
            nextId = state.currentTaskId;
            break;
          }

          // NOTE: currently no solution for this, but we're probably fine, as the current task
          // gets unset every time we go to the finish day view
          // case TaskActionTypes.MoveToArchive: {}
        }

        if (nextId === 'NO_UPDATE') {
          return EMPTY;
        } else {
          return of(new SetCurrentTask(nextId));
        }
      })
    );


  constructor(private _actions$: Actions,
              private _store$: Store<any>,
              private _notifyService: NotifyService,
              private _taskService: TaskService,
              private _reminderService: ReminderService,
              private _electronService: ElectronService,
              private _persistenceService: PersistenceService) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }

  private _saveToLs([action, currentProjectId, taskState]) {
    if (currentProjectId && taskState.isDataLoaded) {
      this._persistenceService.saveTasksForProject(currentProjectId, taskState);
    } else {
      throw new Error('No current project id or data not loaded yet');
    }
  }

  private _removeFromArchive([action, currentProjectId]) {
    const task = action.payload.task;
    const taskIds = [task.id, ...task.subTaskIds];
    this._persistenceService.removeTasksFromArchive(currentProjectId, taskIds);
  }

  private _moveToArchive([action, currentProjectId]) {
    const mainTasks = action.payload.tasks as TaskWithSubTasks[];
    const archive = {
      entities: {},
      ids: []
    };
    mainTasks.forEach((task: TaskWithSubTasks) => {
      archive.entities[task.id] = task;
      archive.ids.push(task.id);
      if (task.subTasks) {
        task.subTasks.forEach((subTask) => {
          archive.entities[subTask.id] = subTask;
          archive.ids.push(subTask.id);
        });
      }
    });

    this._persistenceService.saveToTaskArchiveForProject(currentProjectId, archive);
  }

  private async _notifyAboutTimeEstimateExceeded([action, ct, globalCfg]) {
    if (globalCfg && globalCfg.misc.isNotifyWhenTimeEstimateExceeded
      && ct && ct.timeEstimate > 0
      && ct.timeSpent > ct.timeEstimate) {
      this._notifyService.notify({
        title: 'Time estimate exceeded!',
        body: `You exceeded your estimated time for "${ct.title}".`,
      });

      this._store$.dispatch(new SnackOpen({
        message: `You exceeded your estimated time for "${ct.title.substr(0, 50)}"`,
        actionStr: 'Add 1/2 hour',
        config: {duration: 60 * 1000},
        actionId: TaskActionTypes.UpdateTask,
        actionPayload: {
          task: {
            id: ct.id,
            changes: {
              timeEstimate: (ct.timeSpent + 30 * 60000)
            }
          }
        }
      }));
    }
  }


  private findNextTask(state: TaskState, oldCurrentId?): string {
    let nextId = null;
    const {entities, todaysTaskIds} = state;

    const filterUndoneNotCurrent = (id) => !entities[id].isDone && id !== oldCurrentId;
    const flattenToSelectable = (arr: string[]) => arr.reduce((acc: string[], next: string) => {
      return entities[next].subTaskIds.length > 0
        ? acc.concat(entities[next].subTaskIds)
        : acc.concat(next);
    }, []);

    if (oldCurrentId) {
      const oldCurTask = entities[oldCurrentId];
      if (oldCurTask && oldCurTask.parentId) {
        entities[oldCurTask.parentId].subTaskIds.some((id) => {
          return (id !== oldCurrentId && entities[id].isDone === false)
            ? (nextId = id) && true // assign !!!
            : false;
        });
      }

      if (!nextId) {
        const oldCurIndex = todaysTaskIds.indexOf(oldCurrentId);
        const mainTasksBefore = todaysTaskIds.slice(0, oldCurIndex);
        const mainTasksAfter = todaysTaskIds.slice(oldCurIndex + 1);
        const selectableBefore = flattenToSelectable(mainTasksBefore);
        const selectableAfter = flattenToSelectable(mainTasksAfter);
        nextId = selectableAfter.find(filterUndoneNotCurrent)
          || selectableBefore.reverse().find(filterUndoneNotCurrent);
        nextId = (Array.isArray(nextId)) ? nextId[0] : nextId;

      }
    } else {
      const lastTask = entities[state.lastCurrentTaskId];
      const isLastSelectable = state.lastCurrentTaskId && lastTask && !lastTask.isDone && !lastTask.subTaskIds.length;
      if (isLastSelectable) {
        nextId = state.lastCurrentTaskId;
      } else {
        const selectable = flattenToSelectable(todaysTaskIds).find(filterUndoneNotCurrent);
        nextId = (Array.isArray(selectable)) ? selectable[0] : selectable;
      }
    }

    return nextId;
  }
}


