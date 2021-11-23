import { Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
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
  resetIdle,
  setIdleTime,
  triggerIdle,
  triggerResetBreakTimer,
} from './idle.actions';
import { DialogIdleComponent } from '../dialog-idle/dialog-idle.component';
import { first, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { Task } from '../../tasks/task.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { lazySetInterval } from '../../../../../electron/lazy-set-interval';
import { fromEvent, Observable } from 'rxjs';
import { selectIdleTime } from './idle.selectors';
import { IpcRenderer } from 'electron';
import { IPC } from '../../../../../electron/ipc-events.const';

const DEFAULT_MIN_IDLE_TIME = 60000;
const IDLE_POLL_INTERVAL = 1000;

@Injectable()
export class IdleEffects {
  private lastCurrentTaskId?: string | null;
  private isIdleDialogOpen: boolean = false;
  private clearIdlePollInterval?: () => void;

  triggerIdle$ = createEffect(
    () =>
      (IS_ELECTRON
        ? fromEvent(this._electronService.ipcRenderer as IpcRenderer, IPC.IDLE_TIME).pipe(
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
          )
      ).pipe(tap((idleTimeInMs) => this._handleIdle(idleTimeInMs as number))),
    { dispatch: false },
  );

  constructor(
    private actions$: Actions,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _workContextService: WorkContextService,
    private _electronService: ElectronService,
    private _taskService: TaskService,
    private _configService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _uiHelperService: UiHelperService,
  ) {
    // window.setTimeout(() => {
    //   this._handleIdle(800000);
    // }, 700);
  }

  private _handleIdle(idleTime: number): void {
    const gCfg = this._configService.cfg;
    if (!gCfg) {
      throw new Error();
    }
    const cfg = gCfg.idle;
    const minIdleTime = cfg.minIdleTime || DEFAULT_MIN_IDLE_TIME;

    // don't run if option is not enabled
    if (
      !cfg.isEnableIdleTimeTracking ||
      (cfg.isOnlyOpenIdleWhenCurrentTask && !this._taskService.currentTaskId)
    ) {
      this._store.dispatch(resetIdle());
      return;
    }
    if (idleTime > minIdleTime) {
      this._store.dispatch(triggerIdle({ idleTime }));

      if (!this.isIdleDialogOpen) {
        if (IS_ELECTRON) {
          this._uiHelperService.focusApp();
        }

        if (this._taskService.currentTaskId) {
          // remove idle time already tracked
          this._taskService.removeTimeSpent(this._taskService.currentTaskId, idleTime);
          this.lastCurrentTaskId = this._taskService.currentTaskId;
          this._taskService.setCurrentId(null);
        } else {
          this.lastCurrentTaskId = null;
        }

        this.isIdleDialogOpen = true;
        this._initIdlePoll(idleTime);
        this._matDialog
          .open(DialogIdleComponent, {
            restoreFocus: true,
            disableClose: true,
            data: {
              lastCurrentTaskId: this.lastCurrentTaskId,
              idleTime$: this._store.select(selectIdleTime),
            },
          })
          .afterClosed()
          .pipe(withLatestFrom(this._store.select(selectIdleTime)))
          .subscribe(
            ([res, idleTimeI]: [
              {
                task: Task | string;
                isResetBreakTimer: boolean;
                isTrackAsBreak: boolean;
              },
              number,
            ]) => {
              const { task, isResetBreakTimer, isTrackAsBreak } = res;
              const timeSpent = idleTimeI;

              if (isResetBreakTimer || isTrackAsBreak) {
                this._store.dispatch(triggerResetBreakTimer());
              }

              if (isTrackAsBreak) {
                this._workContextService.addToBreakTimeForActiveContext(
                  undefined,
                  timeSpent,
                );
              }

              if (task) {
                if (typeof task === 'string') {
                  const currId = this._taskService.add(task, false, {
                    timeSpent,
                    timeSpentOnDay: {
                      [getWorklogStr()]: timeSpent,
                    },
                  });
                  this._taskService.setCurrentId(currId);
                } else {
                  this._taskService.addTimeSpent(task, timeSpent);
                  this._taskService.setCurrentId(task.id);
                }
              }

              this._cancelIdlePoll();
              this._store.dispatch(resetIdle());
              this.isIdleDialogOpen = false;
            },
          );
      }
    }
  }

  private _initIdlePoll(initialIdleTime: number): void {
    const idleStart = Date.now();
    this._store.dispatch(setIdleTime({ idleTime: initialIdleTime }));

    this.clearIdlePollInterval = lazySetInterval(() => {
      const delta = Date.now() - idleStart;
      this._store.dispatch(setIdleTime({ idleTime: initialIdleTime + delta }));
    }, IDLE_POLL_INTERVAL);
  }

  private _cancelIdlePoll(): void {
    if (this.clearIdlePollInterval) {
      this.clearIdlePollInterval();
      this.clearIdlePollInterval = undefined;
    }
  }
}
