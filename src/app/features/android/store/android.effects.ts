import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTimeSpent,
  setCurrentTask,
  unsetCurrentTask,
} from '../../tasks/store/task.actions';
import { select, Store } from '@ngrx/store';
import { distinctUntilChanged, tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { GlobalConfigService } from '../../config/global-config.service';
import { androidInterface } from '../android-interface';
import { SyncProviderService } from '../../../imex/sync/sync-provider.service';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { msToClockString } from '../../../ui/duration/ms-to-clock-string.pipe';

// TODO send message to electron when current task changes here

@Injectable()
export class AndroidEffects {
  taskChangeNotification$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask, unsetCurrentTask, addTimeSpent),
        withLatestFrom(
          this._store$.pipe(select(selectCurrentTask)),
          this._globalConfigService.cfg$,
          this._syncProviderService.isSyncing$,
        ),
        tap(([action, current, cfg, isSyncing]) => {
          if (isSyncing) {
            return;
          }

          const isPomodoro = cfg.pomodoro.isEnabled;
          if (current) {
            const progress: number =
              Math.round(
                current &&
                  current.timeEstimate &&
                  (current.timeSpent / current.timeEstimate) * 100,
              ) || 333;
            androidInterface.updatePermanentNotification?.(
              current.title,
              msToClockString(current.timeSpent, true),
              isPomodoro ? -1 : progress,
            );
          } else {
            this._setDefaultNotification();
          }
        }),
      ),
    { dispatch: false },
  );

  syncNotification$ = createEffect(
    () =>
      this._syncProviderService.isSyncing$.pipe(
        distinctUntilChanged(),
        tap((isSync) =>
          isSync
            ? androidInterface.updatePermanentNotification?.(
                this._translateService.instant(
                  T.ANDROID.PERMANENT_NOTIFICATION_MSGS.SYNCING,
                ),
                '',
                999,
              )
            : this._setDefaultNotification(),
        ),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _globalConfigService: GlobalConfigService,
    private _syncProviderService: SyncProviderService,
    private _translateService: TranslateService,
  ) {
    // wait for initial translation
    setTimeout(() => {
      androidInterface.updatePermanentNotification?.(
        '',
        this._translateService.instant(T.ANDROID.PERMANENT_NOTIFICATION_MSGS.INITIAL),
        -1,
      );
    }, 5000);

    // this._translateService
    //   .stream(T.ANDROID.PERMANENT_NOTIFICATION_MSGS.INITIAL)
    //   .pipe(
    //     filter((v) => v !== T.ANDROID.PERMANENT_NOTIFICATION_MSGS.INITIAL),
    //     first(),
    //   )
    //   .subscribe(() => {
    //     androidInterface.updatePermanentNotification?.(
    //       'Super Productivity',
    //       this._translateService.instant(T.ANDROID.PERMANENT_NOTIFICATION_MSGS.INITIAL),
    //       -1,
    //       false,
    //     );
    //   });
  }

  private _setDefaultNotification(): void {
    androidInterface.updatePermanentNotification?.(
      'Super Productivity',
      this._translateService.instant(
        T.ANDROID.PERMANENT_NOTIFICATION_MSGS.NO_ACTIVE_TASKS,
      ),
      -1,
    );
  }
}
