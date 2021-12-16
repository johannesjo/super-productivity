import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTimeSpent,
  setCurrentTask,
  unsetCurrentTask,
} from '../../tasks/store/task.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { GlobalConfigService } from '../../config/global-config.service';
import { androidInterface } from '../android-interface';

// TODO send message to electron when current task changes here

@Injectable()
export class AndroidEffects {
  taskChange$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask, unsetCurrentTask, addTimeSpent),
        withLatestFrom(
          this._store$.pipe(select(selectCurrentTask)),
          this._globalConfigService.cfg$,
        ),
        tap(([action, current, cfg]) => {
          const isPomodoro = cfg.pomodoro.isEnabled;
          if (current) {
            const progress =
              Math.round(
                current &&
                  current.timeEstimate &&
                  (current.timeSpent / current.timeEstimate) * 100,
              ) || -1;
            androidInterface.updateNotificationWidget(
              current.title,
              '',
              isPomodoro ? -1 : progress,
              'play',
            );
          } else {
            androidInterface.updateNotificationWidget(
              'Super Productivity',
              'No active tasks',
              -1,
              'default',
            );
          }
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _globalConfigService: GlobalConfigService,
  ) {}
}
