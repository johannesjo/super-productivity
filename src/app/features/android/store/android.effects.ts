import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTimeSpent,
  setCurrentTask,
  unsetCurrentTask,
  updateTask,
} from '../../tasks/store/task.actions';
import { select, Store } from '@ngrx/store';
import {
  distinctUntilChanged,
  filter,
  map,
  skip,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { GlobalConfigService } from '../../config/global-config.service';
import { androidInterface } from '../android-interface';
import { SyncProviderService } from '../../../imex/sync/sync-provider.service';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { msToClockString } from '../../../ui/duration/ms-to-clock-string.pipe';
import { TaskCopy } from '../../tasks/task.model';
import { showAddTaskBar } from '../../../core-ui/layout/store/layout.actions';

// TODO send message to electron when current task changes here

@Injectable()
export class AndroidEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _globalConfigService = inject(GlobalConfigService);
  private _syncProviderService = inject(SyncProviderService);
  private _translateService = inject(TranslateService);

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
        // skip first to avoid default message
        skip(1),
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

  markTaskAsDone$ = createEffect(() =>
    androidInterface.onMarkCurrentTaskAsDone$.pipe(
      withLatestFrom(this._store$.select(selectCurrentTask)),
      filter(([, currentTask]) => !!currentTask),
      map(([, currentTask]) =>
        updateTask({
          task: { id: (currentTask as TaskCopy).id, changes: { isDone: true } },
        }),
      ),
    ),
  );

  pauseTracking$ = createEffect(() =>
    androidInterface.onPauseCurrentTask$.pipe(
      withLatestFrom(this._store$.select(selectCurrentTask)),
      filter(([, currentTask]) => !!currentTask),
      map(([, currentTask]) => setCurrentTask({ id: null })),
    ),
  );

  showAddTaskBar$ = createEffect(() =>
    androidInterface.onAddNewTask$.pipe(map(() => showAddTaskBar())),
  );

  constructor() {
    // wait for initial translation
    setTimeout(() => {
      androidInterface.updatePermanentNotification?.(
        '',
        this._translateService.instant(T.ANDROID.PERMANENT_NOTIFICATION_MSGS.INITIAL),
        -1,
      );
    }, 4000);
  }

  private _setDefaultNotification(): void {
    androidInterface.updatePermanentNotification?.(
      '',
      this._translateService.instant(
        T.ANDROID.PERMANENT_NOTIFICATION_MSGS.NO_ACTIVE_TASKS,
      ),
      -1,
    );
  }
}
