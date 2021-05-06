import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { AddTimeSpent, SetCurrentTask, TaskActionTypes } from './task.actions';
import { select, Store } from '@ngrx/store';
import { filter, map, tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from './task.selectors';
import { Task } from '../task.model';
import { Observable } from 'rxjs';
import { IPC } from '../../../../../electron/ipc-events.const';
import { IS_ELECTRON } from '../../../app.constants';
import { GlobalConfigState } from '../../config/global-config.model';
import { GlobalConfigService } from '../../config/global-config.service';
import { ElectronService } from '../../../core/electron/electron.service';
import { ipcRenderer } from 'electron';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskElectronEffects {
  @Effect({ dispatch: false })
  taskChangeElectron$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.SetCurrentTask,
      TaskActionTypes.UnsetCurrentTask,
      TaskActionTypes.AddTimeSpent,
    ),
    withLatestFrom(this._store$.pipe(select(selectCurrentTask))),
    tap(([action, current]) => {
      if (IS_ELECTRON) {
        (this._electronService.ipcRenderer as typeof ipcRenderer).send(
          IPC.CURRENT_TASK_UPDATED,
          {
            current,
          },
        );
      }
    }),
  );

  @Effect({ dispatch: false })
  setTaskBarNoProgress$: Observable<any> = this._actions$.pipe(
    ofType(TaskActionTypes.SetCurrentTask),
    filter(() => IS_ELECTRON),
    tap((act: SetCurrentTask) => {
      if (!act.payload) {
        (this._electronService.ipcRenderer as typeof ipcRenderer).send(
          IPC.SET_PROGRESS_BAR,
          {
            progress: 0,
          },
        );
      }
    }),
  );

  @Effect({ dispatch: false })
  setTaskBarProgress$: Observable<any> = this._actions$.pipe(
    ofType(TaskActionTypes.AddTimeSpent),
    filter(() => IS_ELECTRON),
    withLatestFrom(this._configService.cfg$),
    // we display pomodoro progress for pomodoro
    filter(
      ([a, cfg]: [AddTimeSpent, GlobalConfigState]) => !cfg || !cfg.pomodoro.isEnabled,
    ),
    map(([act]) => act.payload.task),
    tap((task: Task) => {
      const progress = task.timeSpent / task.timeEstimate;
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(
        IPC.SET_PROGRESS_BAR,
        {
          progress,
        },
      );
    }),
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _configService: GlobalConfigService,
    private _electronService: ElectronService,
  ) {}
}
