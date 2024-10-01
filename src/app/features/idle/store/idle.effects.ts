import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../../tasks/task.service';
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
import { lazySetInterval } from '../../../../../electron/shared-with-frontend/lazy-set-interval';
import { EMPTY, iif, Observable, of } from 'rxjs';
import { IPC } from '../../../../../electron/shared-with-frontend/ipc-events.const';
import { SimpleCounterService } from '../../simple-counter/simple-counter.service';
import { selectIdleTime, selectIsIdle } from './idle.selectors';
import { turnOffAllSimpleCounterCounters } from '../../simple-counter/store/simple-counter.actions';
import { DialogIdleComponent } from '../dialog-idle/dialog-idle.component';
import { selectIdleConfig } from '../../config/store/global-config.reducer';
import { devError } from '../../../util/dev-error';
import {
  DialogIdlePassedData,
  DialogIdleReturnData,
  IdleTrackItem,
  SimpleCounterIdleBtn,
} from '../dialog-idle/dialog-idle.model';
import { isNotNullOrUndefined } from '../../../util/is-not-null-or-undefined';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { T } from '../../../t.const';
import { DateService } from 'src/app/core/date/date.service';
import { ipcIdleTime$ } from '../../../core/ipc-events';
import { TakeABreakService } from '../../take-a-break/take-a-break.service';

const DEFAULT_MIN_IDLE_TIME = 60000;
const IDLE_POLL_INTERVAL = 1000;

@Injectable()
export class IdleEffects {
  private _isFrontEndIdlePollRunning = false;
  private _clearIdlePollInterval?: () => void;
  private _isDialogOpen: boolean = false;

  // NOTE: needs to live forever since we can't unsubscribe from ipcEvent$
  // TODO check if this works as expected
  private _electronIdleTime$: Observable<number> = IS_ELECTRON ? ipcIdleTime$ : EMPTY;

  private _triggerIdleApis$ = IS_ELECTRON
    ? this._electronIdleTime$
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

  handleIdleInit$ = createEffect(() =>
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
      map(([dialogRes, idleTime]) =>
        idleDialogResult({
          ...dialogRes,
          idleTime,
        }),
      ),
      tap(() => (this._isDialogOpen = false)),
    ),
  );

  handleIdleDialogResult$ = createEffect(() =>
    this.actions$.pipe(
      ofType(idleDialogResult),
      tap(({ trackItems, simpleCounterToggleBtnsWhenNoTrackItems, idleTime }) => {
        this._cancelIdlePoll();
        // handle dialog result weirdness :(
        if (!trackItems) {
          devError('No track items ???');
          return;
        }

        if (trackItems.length === 0 && simpleCounterToggleBtnsWhenNoTrackItems) {
          const activatedItemNr = simpleCounterToggleBtnsWhenNoTrackItems.filter(
            (btn) => btn.isTrackTo,
          ).length;

          // TODO maybe move to effect
          if (activatedItemNr > 0) {
            this._matDialog
              .open(DialogConfirmComponent, {
                restoreFocus: true,
                data: {
                  cancelTxt: T.F.TIME_TRACKING.D_IDLE.SIMPLE_CONFIRM_COUNTER_CANCEL,
                  okTxt: T.F.TIME_TRACKING.D_IDLE.SIMPLE_CONFIRM_COUNTER_OK,
                  message: T.F.TIME_TRACKING.D_IDLE.SIMPLE_COUNTER_CONFIRM_TXT,
                  translateParams: {
                    nr: activatedItemNr,
                  },
                },
              })
              .afterClosed()
              .subscribe((isConfirm: boolean) => {
                if (isConfirm) {
                  // TODO maybe move to effect
                  this._updateSimpleCounterValues(
                    simpleCounterToggleBtnsWhenNoTrackItems,
                    idleTime,
                  );
                }
              });
          }
          return;
        }

        // TODO remove TASK_AND_BREAK case completely
        const itemsWithMappedIdleTime = trackItems.map((trackItem) => ({
          ...trackItem,
          time: trackItem.time === 'IDLE_TIME' ? idleTime : trackItem.time,
        }));

        itemsWithMappedIdleTime.forEach((item) => {
          this._updateSimpleCounterValues(item.simpleCounterToggleBtns, item.time);
        });

        const breakItems = itemsWithMappedIdleTime.filter(
          (item: IdleTrackItem) => item.type === 'BREAK',
        );
        if (breakItems.length) {
          this._store.dispatch(triggerResetBreakTimer());
          breakItems.forEach((item) => {
            this._workContextService.addToBreakTimeForActiveContext(undefined, item.time);
          });
        } else if (itemsWithMappedIdleTime[0]?.isResetBreakTimer) {
          this._store.dispatch(triggerResetBreakTimer());
          this._workContextService.addToBreakTimeForActiveContext(undefined, 1);
        }

        const taskItems = itemsWithMappedIdleTime.filter(
          (item: IdleTrackItem) => item.type === 'TASK',
        );
        let taskItemId: string | undefined;
        taskItems.forEach((taskItem) => {
          if (typeof taskItem.title === 'string') {
            taskItemId = this._taskService.add(taskItem.title, false, {
              timeSpent: taskItem.time,
              timeSpentOnDay: {
                [this._dateService.todayStr()]: taskItem.time,
              },
            });
          } else if (taskItem.task) {
            taskItemId = taskItem.task.id;
            this._taskService.addTimeSpent(taskItem.task, taskItem.time);
          }
        });

        if (taskItems.length === 1 && taskItemId) {
          this._taskService.setCurrentId(taskItemId);
        }
      }),
      // unset idle at the end
      mapTo(resetIdle()),
    ),
  );

  constructor(
    private actions$: Actions,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _simpleCounterService: SimpleCounterService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _uiHelperService: UiHelperService,
    private _dateService: DateService,
    // NOTE needs to be imported somewhere. otherwise won't work
    private _takeABreakService: TakeABreakService,
  ) {
    // window.setTimeout(() => {
    //   this._store.dispatch(triggerIdle({ idleTime: 60 * 1000 }));
    // }, 2700);
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

  private async _updateSimpleCounterValues(
    simpleCounterToggleBtns: SimpleCounterIdleBtn[],
    idleTime: number,
  ): Promise<void> {
    simpleCounterToggleBtns.forEach((tglBtn) => {
      if (tglBtn.isTrackTo) {
        this._simpleCounterService.increaseCounterToday(tglBtn.id, idleTime);
        if (tglBtn.isWasEnabledBefore) {
          this._simpleCounterService.toggleCounter(tglBtn.id);
        }
      }
    });
  }
}
