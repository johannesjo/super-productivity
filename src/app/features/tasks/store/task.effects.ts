import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {
  AddTaskReminder,
  AddTimeSpent,
  DeleteTask,
  Move,
  MoveToBacklog,
  RemoveTaskReminder,
  RoundTimeSpentForDay,
  SetCurrentTask,
  TaskActionTypes,
  UpdateTask,
  UpdateTaskReminder
} from './task.actions';
import {select, Store} from '@ngrx/store';
import {filter, map, mergeMap, switchMap, tap, throttleTime, withLatestFrom} from 'rxjs/operators';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {selectCurrentTask, selectTaskFeatureState, selectTasksWorkedOnOrDoneTodayFlat} from './task.selectors';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {SnackOpen} from '../../../core/snack/store/snack.actions';
import {NotifyService} from '../../../core/notify/notify.service';
import {TaskService} from '../task.service';
import {selectConfigFeatureState, selectMiscConfig} from '../../config/store/config.reducer';
import {AttachmentActionTypes} from '../../attachment/store/attachment.actions';
import {Task, TaskWithSubTasks} from '../task.model';
import {TaskState} from './task.reducer';
import {EMPTY, Observable, of} from 'rxjs';
import {ElectronService} from 'ngx-electron';
import {IPC_CURRENT_TASK_UPDATED, IPC_SET_PROGRESS_BAR} from '../../../../../electron/ipc-events.const';
import {IS_ELECTRON} from '../../../app.constants';
import {ReminderService} from '../../reminder/reminder.service';
import {GlobalConfig, MiscConfig} from '../../config/config.model';
import {truncate} from '../../../util/truncate';
import {roundDurationVanilla} from '../../../util/round-duration';
import {ConfigService} from '../../config/config.service';

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
        TaskActionTypes.RemoveTaskReminder,
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

  @Effect() addTaskReminder$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTaskReminder,
      ),
      mergeMap((a: AddTaskReminder) => {
        const {id, title, remindAt, isMoveToBacklog} = a.payload;
        const reminderId = this._reminderService.addReminder('TASK', id, title, remindAt);

        return [
          new UpdateTask({
            task: {id, changes: {reminderId}}
          }),
          new SnackOpen({
            type: 'SUCCESS',
            msg: `Scheduled task "${truncate(title)}"`,
            ico: 'schedule',
          }),
          ...(isMoveToBacklog ? [new MoveToBacklog({id})] : []),
        ];
      })
    );

  @Effect() updateTaskReminder$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTaskReminder,
      ),
      map((a: UpdateTaskReminder) => {
        const {title, remindAt, reminderId} = a.payload;
        this._reminderService.updateReminder(reminderId, {
          remindAt,
          title,
        });
        return new SnackOpen({
          type: 'SUCCESS',
          msg: `Updated reminder for task "${truncate(title)}"`,
          ico: 'schedule',
        });
      })
    );

  @Effect() removeTaskReminder$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.RemoveTaskReminder,
      ),
      mergeMap((a: RemoveTaskReminder) => {
        const {id, reminderId} = a.payload;
        this._reminderService.removeReminder(reminderId);

        return [
          new UpdateTask({
            task: {
              id,
              changes: {reminderId: null}
            }
          }),
          new SnackOpen({
            type: 'SUCCESS',
            msg: `Deleted reminder for task`,
            ico: 'schedule',
          }),
        ];
      })
    );

  @Effect() snackDelete$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.DeleteTask,
      ),
      map((action_: DeleteTask) => {
        const action = action_ as DeleteTask;
        return new SnackOpen({
          msg: `Deleted task "${truncate(action.payload.task.title)}"`,
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
      tap(([a, state]) => {
        const idsBefore = state.stateBefore.ids as string[];
        const deletedTaskIds = idsBefore.filter((id) => !state.ids.includes(id));
        deletedTaskIds.forEach((id) => {
          this._reminderService.removeReminderByRelatedIdIfSet(id);
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

  @Effect() roundTimesSpentForDay$: Observable<any> = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.RoundTimeSpentForDay,
      ),
      filter((a: RoundTimeSpentForDay) => a.payload && a.payload.day && !!a.payload.roundTo),
      withLatestFrom(
        this._store$.pipe(select(selectTasksWorkedOnOrDoneTodayFlat)),
      ),
      mergeMap(([act, tasks]): UpdateTask[] => {
        const {day, roundTo, isRoundUp} = act.payload;
        return Object.keys(tasks).filter(id => {
          return !tasks[id].subTaskIds.length && tasks[id].timeSpentOnDay[day];
        }).map(id => {
          const task = tasks[id];
          const updateTimeSpent = roundDurationVanilla(task.timeSpentOnDay[day], roundTo, isRoundUp);
          return new UpdateTask({
            task: {
              id: task.id,
              changes: {
                timeSpentOnDay: {
                  ...task.timeSpentOnDay,
                  [day]: updateTimeSpent,
                }
              },
            }
          });
        });
      }),
    );

  @Effect({dispatch: false}) setTaskBarNoProgress$: Observable<any> = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.SetCurrentTask,
      ),
      filter(() => IS_ELECTRON),
      tap((act: SetCurrentTask) => {
        if (!act.payload) {
          this._electronService.ipcRenderer.send(IPC_SET_PROGRESS_BAR, {progress: 0});
        }
      }),
    );

  @Effect({dispatch: false}) setTaskBarProgress$: Observable<any> = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTimeSpent,
      ),
      filter(() => IS_ELECTRON),
      withLatestFrom(this._configService.cfg$),
      // we display pomodoro progress for pomodoro
      filter(([a, cfg]: [AddTimeSpent, GlobalConfig]) => !cfg || !cfg.pomodoro.isEnabled),
      switchMap(([act]) => this._taskService.getById(act.payload.id)),
      tap((task: Task) => {
        const progress = task.timeSpent / task.timeEstimate;
        this._electronService.ipcRenderer.send(IPC_SET_PROGRESS_BAR, {progress});
      }),
    );

  constructor(private _actions$: Actions,
              private _store$: Store<any>,
              private _notifyService: NotifyService,
              private _taskService: TaskService,
              private _configService: ConfigService,
              private _reminderService: ReminderService,
              private _electronService: ElectronService,
              private _persistenceService: PersistenceService) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }

  private _saveToLs([action, currentProjectId, taskState]) {
    if (currentProjectId && taskState.isDataLoaded) {
      this._persistenceService.task.save(currentProjectId, taskState);
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
        body: `You exceeded your estimated time for "${truncate(ct.title)}".`,
      });

      this._store$.dispatch(new SnackOpen({
        msg: `Time estimate exceeded for "${truncate(ct.title)}"`,
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


