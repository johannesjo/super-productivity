import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { ElectronService } from '../../../core/electron/electron.service';
import { TaskService } from '../../tasks/task.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { UiHelperService } from '../../ui-helper/ui-helper.service';
import { IS_ELECTRON } from '../../../app.constants';
import {
  idleDialogResult,
  openIdleDialog,
  resetIdle,
  setIdleTime,
  triggerIdle,
  triggerResetBreakTimer,
} from './idle.actions';
import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  mapTo,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { lazySetInterval } from '../../../../../electron/lazy-set-interval';
import { EMPTY, fromEvent, iif, Observable, of } from 'rxjs';
import { IpcRenderer } from 'electron';
import { IPC } from '../../../../../electron/ipc-events.const';
import { SimpleCounterService } from '../../simple-counter/simple-counter.service';
import { selectIdleTime, selectIsIdle } from './idle.selectors';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { turnOffAllSimpleCounterCounters } from '../../simple-counter/store/simple-counter.actions';
import { IdleService } from '../idle.service';
import { DialogIdleComponent } from '../dialog-idle/dialog-idle.component';
import { selectIdleConfig } from '../../config/store/global-config.reducer';
import { devError } from '../../../util/dev-error';
import {
  DialogIdlePassedData,
  DialogIdleReturnData,
} from '../dialog-idle/dialog-idle.model';
import { isNotNullOrUndefined } from '../../../util/is-not-null-or-undefined';

const DEFAULT_MIN_IDLE_TIME = 60000;
const IDLE_POLL_INTERVAL = 1000;

@Injectable()
export class IdleEffects {
  private _isFrontEndIdlePollRunning = false;
  private _clearIdlePollInterval?: () => void;
  private _isDialogOpen: boolean = false;

  private _triggerIdleApis$ = IS_ELECTRON
    ? fromEvent(this._electronService.ipcRenderer as IpcRenderer, IPC.IDLE_TIME).pipe(
        tap((v) => console.log('IIIIIIIIII', v)),
        map(([ev, idleTimeInMs]: any) => idleTimeInMs as number),
      )
    : this._chromeExtensionInterfaceService.onReady$.pipe(
        first(),
        switchMap(() => {
          return new Observable((subscriber) => {
            this._chromeExtensionInterfaceService.addEventListener(
              IPC.IDLE_TIME,
              (ev: Event, data?: unknown) => {
                const idleTimeInMs = Number(data);
                subscriber.next(idleTimeInMs);
              },
            );
          });
        }),
      );

  triggerIdleWhenEnabled$ = createEffect(() =>
    this._store.select(selectIdleConfig).pipe(
      switchMap(
        ({
          isEnableIdleTimeTracking,
          isOnlyOpenIdleWhenCurrentTask,
          minIdleTime = DEFAULT_MIN_IDLE_TIME,
        }) =>
          !isEnableIdleTimeTracking
            ? of(resetIdle())
            : this._triggerIdleApis$.pipe(
                switchMap((idleTimeInMs) => {
                  if (isOnlyOpenIdleWhenCurrentTask && !this._taskService.currentTaskId) {
                    return of(resetIdle());
                  }
                  const idleTime = idleTimeInMs as number;
                  return idleTime >= minIdleTime && !this._isFrontEndIdlePollRunning
                    ? of(triggerIdle({ idleTime }))
                    : EMPTY;
                }),
              ),
      ),
    ),
  );

  handleIdle$ = createEffect(() =>
    this._store.select(selectIsIdle).pipe(
      distinctUntilChanged(),
      switchMap((isIdle) => iif(() => isIdle, of(isIdle))),
      withLatestFrom(
        this._store.select(selectIdleTime),
        this._simpleCounterService.enabledSimpleStopWatchCounters$,
      ),
      map(([, idleTime, enabledSimpleStopWatchCounters]) => {
        // ALL IDLE SIDE EFFECTS
        // ---------------------
        if (IS_ELECTRON) {
          this._uiHelperService.focusApp();
        }

        // untrack current task time und unselect
        let lastCurrentTaskId: string | null;
        if (this._taskService.currentTaskId) {
          lastCurrentTaskId = this._taskService.currentTaskId;
          // remove idle time already tracked
          this._taskService.removeTimeSpent(this._taskService.currentTaskId, idleTime);
          this._taskService.setCurrentId(null);
        } else {
          lastCurrentTaskId = null;
        }

        // untrack on simple counter time and turn off
        if (enabledSimpleStopWatchCounters.length) {
          enabledSimpleStopWatchCounters.forEach((simpleCounter) => {
            if (simpleCounter.isOn) {
              this._simpleCounterService.decreaseCounterToday(simpleCounter.id, idleTime);
            }
          });
          this._store.dispatch(turnOffAllSimpleCounterCounters());
        }

        // NOTE: we need a new idleTimer since the other values are reset as soon as the user is active again
        this._initIdlePoll(idleTime);

        // this._openDialog(enabledSimpleStopWatchCounters, lastCurrentTaskId);
        // finally open dialog
        return openIdleDialog({ enabledSimpleStopWatchCounters, lastCurrentTaskId });
      }),
    ),
  );

  idleDialog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(openIdleDialog),
      filter(() => !this._isDialogOpen),
      tap(() => (this._isDialogOpen = true)),
      // use exhaustMap to prevent opening up multiple dialogs
      exhaustMap(({ enabledSimpleStopWatchCounters, lastCurrentTaskId }) =>
        this._matDialog
          .open<
            DialogIdleComponent,
            DialogIdlePassedData,
            DialogIdleReturnData | undefined
          >(DialogIdleComponent, {
            restoreFocus: true,
            disableClose: true,
            closeOnNavigation: false,
            data: {
              lastCurrentTaskId,
              enabledSimpleStopWatchCounters,
            },
          })
          .afterClosed(),
      ),
      tap((dialogRes) => {
        if (!dialogRes) {
          devError('Idle dialog unexpected empty result ???');
        }
      }),
      isNotNullOrUndefined(),
      withLatestFrom(this._store.select(selectIdleTime)),
      map(([{ task, isResetBreakTimer, isTrackAsBreak }, idleTimeI]) =>
        idleDialogResult({
          timeSpent: idleTimeI,
          selectedTaskOrTitle: task as any,
          isResetBreakTimer,
          isTrackAsBreak,
        }),
      ),
      tap(() => (this._isDialogOpen = false)),
    ),
  );

  onIdleDialogResult$ = createEffect(() =>
    this.actions$.pipe(
      ofType(idleDialogResult),
      tap(({ timeSpent, selectedTaskOrTitle, isResetBreakTimer, isTrackAsBreak }) => {
        if (isResetBreakTimer || isTrackAsBreak) {
          this._store.dispatch(triggerResetBreakTimer());
        }

        if (isTrackAsBreak) {
          this._workContextService.addToBreakTimeForActiveContext(undefined, timeSpent);
        }

        if (selectedTaskOrTitle) {
          if (typeof selectedTaskOrTitle === 'string') {
            const currId = this._taskService.add(selectedTaskOrTitle, false, {
              timeSpent,
              timeSpentOnDay: {
                [getWorklogStr()]: timeSpent,
              },
            });
            this._taskService.setCurrentId(currId);
          } else {
            this._taskService.addTimeSpent(selectedTaskOrTitle, timeSpent);
            this._taskService.setCurrentId(selectedTaskOrTitle.id);
          }
        }

        this._cancelIdlePoll();
      }),
      // unset idle at the end
      mapTo(resetIdle()),
    ),
  );

  constructor(
    private actions$: Actions,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _workContextService: WorkContextService,
    private _electronService: ElectronService,
    private _taskService: TaskService,
    private _simpleCounterService: SimpleCounterService,
    private _configService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _uiHelperService: UiHelperService,
    private _idleService: IdleService,
  ) {
    window.setTimeout(() => {
      this._store.dispatch(triggerIdle({ idleTime: 60 * 1000 }));
    }, 2700);
  }

  private _initIdlePoll(initialIdleTime: number): void {
    const idleStart = Date.now();
    this._store.dispatch(setIdleTime({ idleTime: initialIdleTime }));

    this._clearIdlePollInterval = lazySetInterval(() => {
      const delta = Date.now() - idleStart;
      this._store.dispatch(setIdleTime({ idleTime: initialIdleTime + delta }));
    }, IDLE_POLL_INTERVAL);
    this._isFrontEndIdlePollRunning = true;
  }

  private _cancelIdlePoll(): void {
    if (this._clearIdlePollInterval) {
      this._clearIdlePollInterval();
      this._clearIdlePollInterval = undefined;
    }
    this._isFrontEndIdlePollRunning = false;
  }
}
