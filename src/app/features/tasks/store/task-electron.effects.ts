import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { setCurrentTask, unsetCurrentTask } from './task.actions';
import { select, Store } from '@ngrx/store';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from './task.selectors';
import { IS_ELECTRON } from '../../../app.constants';
import { GlobalConfigService } from '../../config/global-config.service';
import { selectIsFocusOverlayShown } from '../../focus-mode/store/focus-mode.selectors';
import { PomodoroService } from '../../pomodoro/pomodoro.service';
import { TimeTrackingActions } from '../../time-tracking/store/time-tracking.actions';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskElectronEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _configService = inject(GlobalConfigService);
  private _pomodoroService = inject(PomodoroService);

  taskChangeElectron$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask, unsetCurrentTask, TimeTrackingActions.addTimeSpent),
        withLatestFrom(this._store$.pipe(select(selectCurrentTask))),
        withLatestFrom(
          this._store$.pipe(select(selectCurrentTask)),
          this._pomodoroService.isEnabled$,
          this._pomodoroService.currentSessionTime$,
        ),
        tap(([action, current, isPomodoroEnabled, currentPomodoroSessionTime]) => {
          if (IS_ELECTRON) {
            window.ea.updateCurrentTask(
              current,
              isPomodoroEnabled,
              currentPomodoroSessionTime,
            );
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
          ofType(TimeTrackingActions.addTimeSpent),
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
