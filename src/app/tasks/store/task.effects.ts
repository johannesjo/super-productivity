import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { DeleteTask, TaskActionTypes } from './task.actions';
import { select, Store } from '@ngrx/store';
import { map, tap, throttleTime, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { selectCurrentTask, selectTaskFeatureState } from './task.selectors';
import { selectCurrentProjectId } from '../../project/store/project.reducer';
import { SnackOpen } from '../../core/snack/store/snack.actions';
import { TaskState } from './task.reducer';
import { NotifyService } from '../../core/notify/notify.service';
import { TaskService } from '../task.service';
import { selectConfigFeatureState } from '../../core/config/store/config.reducer';
import { AttachmentActionTypes } from '../attachment/store/attachment.actions';

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
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(this._moveToArchive.bind(this))
    );


  @Effect({dispatch: false}) updateTask$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.AddTimeSpent,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.UndoDeleteTask,
        TaskActionTypes.AddSubTask,
        TaskActionTypes.SetCurrentTask,
        TaskActionTypes.UnsetCurrentTask,
        TaskActionTypes.UpdateTask,
        TaskActionTypes.Move,
        TaskActionTypes.MoveToArchive,
        TaskActionTypes.MoveToBacklog,
        TaskActionTypes.MoveToToday,

        AttachmentActionTypes.DeleteAttachment,
        AttachmentActionTypes.AddAttachment,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) updateTaskUi$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTaskUi,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(this._saveToLsNoUpdateForLastActive.bind(this))
    );

  @Effect() snackDelete$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.DeleteTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      map(([action_, state]) => {
        const action = action_ as DeleteTask;
        return new SnackOpen({
          message: `Deleted task "${state.stateBefore.entities[action.payload.id].title}"`,
          config: {duration: 5000},
          actionStr: 'Undo',
          actionId: TaskActionTypes.UndoDeleteTask
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


  constructor(private _actions$: Actions,
              private _store$: Store<any>,
              private _notifyService: NotifyService,
              private _taskService: TaskService,
              private _persistenceService: PersistenceService) {
  }

  private _saveToLs([action, currentProjectId, taskState]) {
    this._persistenceService.saveLastActive();
    this._saveToLsNoUpdateForLastActive([action, currentProjectId, taskState]);
  }

  private _saveToLsNoUpdateForLastActive([action, currentProjectId, taskState]) {
    if (currentProjectId) {
      this._persistenceService.saveTasksForProject(currentProjectId, taskState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _moveToArchive([action, currentProjectId, taskState]) {
    const mainTaskIds = action.payload.ids;
    const stateBefore: TaskState = taskState.stateBefore;
    const archive = {
      entities: {},
      ids: []
    };
    mainTaskIds.forEach((id) => {
      const task = stateBefore.entities[id];
      archive.entities[id] = task;
      archive.ids.push(id);
      task.subTaskIds.forEach((subId) => {
        archive.entities[subId] = stateBefore.entities[subId];
        archive.ids.push(subId);
      });
    });

    this._persistenceService.saveLastActive();
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
        message: `You exceeded your estimated time for "${ct.title}"`,
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
}


