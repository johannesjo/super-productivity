import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { addTimeSpent, setCurrentTask, unsetCurrentTask } from './task.actions';
import { select, Store } from '@ngrx/store';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from './task.selectors';
import { IS_ELECTRON } from '../../../app.constants';
import { GlobalConfigService } from '../../config/global-config.service';
import { selectIsFocusOverlayShown } from '../../focus-mode/store/focus-mode.selectors';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskElectronEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _configService = inject(GlobalConfigService);

  taskChangeElectron$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask, unsetCurrentTask, addTimeSpent),
        withLatestFrom(this._store$.pipe(select(selectCurrentTask))),
        tap(([action, current]) => {
          if (IS_ELECTRON) {
            window.ea.updateCurrentTask(current);
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
              window.ea.setProgressBar({
                progress: 0,
                progressBarMode: 'pause',
              });
            }
          }),
        ),
      { dispatch: false },
    );

  setTaskBarProgress$: any =
    IS_ELECTRON &&
    createEffect(
      () =>
        this._actions$.pipe(
          ofType(addTimeSpent),
          withLatestFrom(
            this._configService.cfg$,
            this._store$.select(selectIsFocusOverlayShown),
          ),
          // we display pomodoro progress for pomodoro
          filter(
            ([a, cfg, isFocusSessionRunning]) =>
              !isFocusSessionRunning && (!cfg || !cfg.pomodoro.isEnabled),
          ),
          tap(([{ task }]) => {
            const progress = task.timeSpent / task.timeEstimate;
            window.ea.setProgressBar({
              progress,
              progressBarMode: 'normal',
            });
          }),
        ),
      { dispatch: false },
    );
}
