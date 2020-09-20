import { Injectable } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { ChromeExtensionInterfaceService } from '../../core/chrome-extension-interface/chrome-extension-interface.service';
import { TaskService } from '../tasks/task.service';
import { IPC } from '../../../../electron/ipc-events.const';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { GlobalConfigService } from '../config/global-config.service';
import { Task } from '../tasks/task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { ElectronService } from '../../core/electron/electron.service';
import { UiHelperService } from '../ui-helper/ui-helper.service';
import { WorkContextService } from '../work-context/work-context.service';
import { ipcRenderer } from 'electron';
import { lazySetInterval } from '../../../../electron/lazy-set-interval';

const DEFAULT_MIN_IDLE_TIME = 60000;
const IDLE_POLL_INTERVAL = 1000;

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  isIdle: boolean = false;
  private _isIdle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isIdle$: Observable<boolean> = this._isIdle$.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay(1),
  );

  private _idleTime$: BehaviorSubject<number> = new BehaviorSubject(0);
  idleTime$: Observable<number> = this._idleTime$.asObservable();
  private _triggerResetBreakTimer$: Subject<boolean> = new Subject();
  triggerResetBreakTimer$: Observable<boolean> = this._triggerResetBreakTimer$.asObservable();

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
    private _uiHelperService: UiHelperService,
  ) {
  }

  init() {
    if (IS_ELECTRON) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).on(IPC.IDLE_TIME, (ev, idleTimeInMs) => {
        this.handleIdle(idleTimeInMs);
      });
    } else {
      this._chromeExtensionInterfaceService.onReady$.subscribe(() => {
        this._chromeExtensionInterfaceService.addEventListener(IPC.IDLE_TIME, (ev: Event, data?: unknown) => {
          const idleTimeInMs = Number(data);
          this.handleIdle(idleTimeInMs);
        });
      });
    }

    // window.setTimeout(() => {
    //   this.handleIdle(800000);
    // }, 700);
  }

  handleIdle(idleTime: number) {
    console.log('IDLE_TIME', idleTime, new Date());
    const gCfg = this._configService.cfg;
    if (!gCfg) {
      throw new Error();
    }
    const cfg = gCfg.idle;
    const minIdleTime = cfg.minIdleTime || DEFAULT_MIN_IDLE_TIME;

    // don't run if option is not enabled
    if (!cfg.isEnableIdleTimeTracking || (cfg.isOnlyOpenIdleWhenCurrentTask && !this._taskService.currentTaskId)) {
      this.isIdle = false;
      this._isIdle$.next(false);
      return;
    }
    if (idleTime > minIdleTime) {
      this.isIdle = true;
      this._isIdle$.next(true);

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
        this.initIdlePoll(idleTime);
        this._matDialog.open(DialogIdleComponent, {
          restoreFocus: true,
          data: {
            lastCurrentTaskId: this.lastCurrentTaskId,
            idleTime$: this.idleTime$,
          }
        }).afterClosed()
          .subscribe((res: { task: Task | string, isResetBreakTimer: boolean, isTrackAsBreak: boolean }) => {
            const {task, isResetBreakTimer, isTrackAsBreak} = res;
            const timeSpent = this._idleTime$.getValue();

            if (isResetBreakTimer || isTrackAsBreak) {
              this._triggerResetBreakTimer$.next(true);
            }

            if (isTrackAsBreak) {
              this._workContextService.addToBreakTimeForActiveContext(undefined, timeSpent);
            }

            if (task) {
              if (typeof task === 'string') {
                const currId = this._taskService.add(task, false, {
                  timeSpent,
                  timeSpentOnDay: {
                    [getWorklogStr()]: timeSpent
                  }
                });
                this._taskService.setCurrentId(currId);
              } else {
                this._taskService.addTimeSpent(task, timeSpent);
                this._taskService.setCurrentId(task.id);
              }
            }

            this.cancelIdlePoll();
            this._isIdle$.next(false);
            this.isIdleDialogOpen = false;
          });
      }
    }
  }

  initIdlePoll(initialIdleTime: number) {
    const idleStart = Date.now();
    this._idleTime$.next(initialIdleTime);

    this.clearIdlePollInterval = lazySetInterval(() => {
      const delta = Date.now() - idleStart;
      this._idleTime$.next(initialIdleTime + delta);
    }, IDLE_POLL_INTERVAL);
  }

  cancelIdlePoll() {
    if (this.clearIdlePollInterval) {
      this.clearIdlePollInterval();
      this.clearIdlePollInterval = undefined;
      this._idleTime$.next(0);
    }
  }
}
