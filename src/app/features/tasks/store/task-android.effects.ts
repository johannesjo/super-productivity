import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { addTimeSpent, setCurrentTask, unsetCurrentTask } from './task.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from './task.selectors';
import { GlobalConfigService } from '../../config/global-config.service';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { androidInterface } from '../../../core/android/android-interface';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskAndroidEffects {
  taskChangeElectron$: any =
    IS_ANDROID_WEB_VIEW &&
    createEffect(
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
              androidInterface.updateNotificationWidget('', '', -1, 'default');
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
