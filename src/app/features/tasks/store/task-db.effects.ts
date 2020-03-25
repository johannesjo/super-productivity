import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {TaskActionTypes} from './task.actions';
import {select, Store} from '@ngrx/store';
import {tap, withLatestFrom} from 'rxjs/operators';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {selectTaskFeatureState} from './task.selectors';
import {NotifyService} from '../../../core/notify/notify.service';
import {TaskService} from '../task.service';
import {ReminderService} from '../../reminder/reminder.service';
import {GlobalConfigService} from '../../config/global-config.service';
import {TaskRepeatCfgActionTypes} from '../../task-repeat-cfg/store/task-repeat-cfg.actions';
import {BannerService} from '../../../core/banner/banner.service';
import {SnackService} from '../../../core/snack/snack.service';
import {Router} from '@angular/router';
import {ProjectService} from '../../project/project.service';
import {ElectronService} from '../../../core/electron/electron.service';
import {TaskAttachmentActionTypes} from '../task-attachment/task-attachment.actions';
import {TaskState} from '../task.model';

@Injectable()
export class TaskDbEffects {
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
        // TaskActionTypes.SetCurrentTask,
        // TaskActionTypes.UnsetCurrentTask,
        TaskActionTypes.UpdateTask,
        TaskActionTypes.UpdateTaskTags,
        TaskActionTypes.MoveSubTask,
        TaskActionTypes.MoveSubTaskUp,
        TaskActionTypes.MoveSubTaskDown,
        TaskActionTypes.MoveToArchive,
        TaskActionTypes.MoveToOtherProject,
        TaskActionTypes.ToggleStart,
        TaskActionTypes.RoundTimeSpentForDay,

        // SUB ACTIONS
        TaskAttachmentActionTypes.AddTaskAttachment,
        TaskAttachmentActionTypes.DeleteTaskAttachment,
        TaskAttachmentActionTypes.UpdateTaskAttachment,

        // RELATED ACTIONS
        TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(([, taskState]) => this._saveToLs(taskState)),
      tap(this._updateLastActive.bind(this)),
    );

  @Effect({dispatch: false}) updateTaskUi$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTaskUi,
        TaskActionTypes.ToggleTaskShowSubTasks,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(([, taskState]) => this._saveToLs(taskState)),
    );

  constructor(private _actions$: Actions,
              private _store$: Store<any>,
              private _notifyService: NotifyService,
              private _taskService: TaskService,
              private _configService: GlobalConfigService,
              private _bannerService: BannerService,
              private _reminderService: ReminderService,
              private _router: Router,
              private _snackService: SnackService,
              private _projectService: ProjectService,
              private _electronService: ElectronService,
              private _persistenceService: PersistenceService) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }

  private _saveToLs(taskState: TaskState) {
    this._persistenceService.task.saveState(taskState);
  }
}


