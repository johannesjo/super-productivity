import { Injectable } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { ChromeExtensionInterfaceService } from '../../core/chrome-extension-interface/chrome-extension-interface.service';
import { TaskService } from '../tasks/task.service';
import { IPC } from '../../../../electron/ipc-events.const';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { GlobalConfigService } from '../config/global-config.service';
import { Task } from '../tasks/task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { distinctUntilChanged, shareReplay, withLatestFrom } from 'rxjs/operators';
import { ElectronService } from '../../core/electron/electron.service';
import { UiHelperService } from '../ui-helper/ui-helper.service';
import { WorkContextService } from '../work-context/work-context.service';
import { ipcRenderer } from 'electron';
import { lazySetInterval } from '../../../../electron/lazy-set-interval';
import { Store } from '@ngrx/store';
import { selectIdleTime, selectIsIdle } from './store/idle.selectors';
import { resetIdle, setIdleTime, triggerIdle } from './store/idle.actions';

const DEFAULT_MIN_IDLE_TIME = 60000;
const IDLE_POLL_INTERVAL = 1000;

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  private _isIdle$: Observable<boolean> = this._store.select(selectIsIdle);
  isIdle$: Observable<boolean> = this._isIdle$.pipe(
    distinctUntilChanged(),
    shareReplay(1),
  );
  idleTime$: Observable<number> = this._store.select(selectIdleTime);

  private _triggerResetBreakTimer$: Subject<boolean> = new Subject();

  // TODO check
  triggerResetBreakTimer$: Observable<boolean> =
    this._triggerResetBreakTimer$.asObservable();

  private lastCurrentTaskId?: string | null;
  private isIdleDialogOpen: boolean = false;
  private clearIdlePollInterval?: () => void;

  constructor(
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _workContextService: WorkContextService,
    private _electronService: ElectronService,
    private _taskService: TaskService,
    private _configService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _uiHelperService: UiHelperService,
  ) {}

  init(): void {
    if (IS_ELECTRON) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).on(
        IPC.IDLE_TIME,
        (ev, idleTimeInMs) => {
          this._handleIdle(idleTimeInMs);
        },
      );
    } else {
      this._chromeExtensionInterfaceService.onReady$.subscribe(() => {
        this._chromeExtensionInterfaceService.addEventListener(
          IPC.IDLE_TIME,
          (ev: Event, data?: unknown) => {
            const idleTimeInMs = Number(data);
            this._handleIdle(idleTimeInMs);
          },
        );
      });
    }

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
              idleTime$: this.idleTime$,
            },
          })
          .afterClosed()
          .pipe(withLatestFrom(this.idleTime$))
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
                this._triggerResetBreakTimer$.next(true);
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
