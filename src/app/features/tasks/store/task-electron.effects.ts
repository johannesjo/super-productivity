import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { addTimeSpent, setCurrentTask, unsetCurrentTask } from './task.actions';
import { select, Store } from '@ngrx/store';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from './task.selectors';
import { Observable } from 'rxjs';
import { IS_ELECTRON } from '../../../app.constants';
import { GlobalConfigService } from '../../config/global-config.service';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskElectronEffects {
  taskChangeElectron$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask, unsetCurrentTask, addTimeSpent),
        withLatestFrom(this._store$.pipe(select(selectCurrentTask))),
        tap(([action, current]) => {
          if (IS_ELECTRON) {
            window.electronAPI.updateCurrentTask(current);
          }
        }),
      ),
    { dispatch: false },
  );

  setTaskBarNoProgress$ =
    IS_ELECTRON &&
    createEffect(
      () =>
        this._actions$.pipe(
          ofType(setCurrentTask),
          tap(({ id }) => {
            if (!id) {
              window.electronAPI.setProgressBar({
                progress: 0,
                progressBarMode: 'pause',
              });
            }
          }),
        ),
      { dispatch: false },
    );

  setTaskBarProgress$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTimeSpent),
        filter(() => IS_ELECTRON),
        withLatestFrom(this._configService.cfg$),
        // we display pomodoro progress for pomodoro
        filter(([a, cfg]) => !cfg || !cfg.pomodoro.isEnabled),
        tap(([{ task }]) => {
          const progress = task.timeSpent / task.timeEstimate;
          window.electronAPI.setProgressBar({
            progress,
            progressBarMode: 'normal',
          });
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _configService: GlobalConfigService,
  ) {}
}
