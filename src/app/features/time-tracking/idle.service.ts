import {Injectable} from '@angular/core';
import {IS_ELECTRON} from '../../app.constants';
import {ChromeExtensionInterfaceService} from '../../core/chrome-extension-interface/chrome-extension-interface.service';
import {ProjectService} from '../project/project.service';
import {TaskService} from '../tasks/task.service';
import {IPC} from '../../../../electron/ipc-events.const';
import {MatDialog} from '@angular/material/dialog';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {DialogIdleComponent} from './dialog-idle/dialog-idle.component';
import {GlobalConfigService} from '../config/global-config.service';
import {Task} from '../tasks/task.model';
import {getWorklogStr} from '../../util/get-work-log-str';
import {distinctUntilChanged, shareReplay} from 'rxjs/operators';
import {ElectronService} from '../../core/electron/electron.service';
import {UiHelperService} from '../ui-helper/ui-helper.service';

const DEFAULT_MIN_IDLE_TIME = 60000;
const IDLE_POLL_INTERVAL = 1000;

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  isIdle = false;
  private _isIdle$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  isIdle$: Observable<boolean> = this._isIdle$.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay(1),
  );

  private _idleTime$: BehaviorSubject<number> = new BehaviorSubject(0);
  idleTime$: Observable<number> = this._idleTime$.asObservable();
  private _triggerResetBreakTimer$ = new Subject<boolean>();
  triggerResetBreakTimer$: Observable<boolean> = this._triggerResetBreakTimer$.asObservable();


  private lastCurrentTaskId: string;
  private isIdleDialogOpen = false;
  private idlePollInterval: number;

  constructor(
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _taskService: TaskService,
    private _configService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _uiHelperService: UiHelperService,
  ) {
  }

  init() {
    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.on(IPC.IDLE_TIME, (ev, idleTimeInMs) => {
        this.handleIdle(idleTimeInMs);
      });
    }
    this._chromeExtensionInterface.onReady$.subscribe(() => {
      this._chromeExtensionInterface.addEventListener(IPC.IDLE_TIME, (ev, idleTimeInMs) => {
        this.handleIdle(idleTimeInMs);
      });
    });

    // window.setTimeout(() => {
    //   this.handleIdle(800000);
    // }, 700);
  }

  handleIdle(idleTime) {
    console.log('IDLE_TIME', idleTime, new Date());
    const cfg = this._configService.cfg.idle;
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
              // TODO
              this._projectService.addToBreakTime(undefined, undefined, timeSpent);
            }

            if (task) {
              if (typeof task === 'string') {
                this._taskService.add(task, false, {
                  timeSpent,
                  timeSpentOnDay: {
                    [getWorklogStr()]: timeSpent
                  }
                });
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


  initIdlePoll(initialIdleTime) {
    const idleStart = Date.now();
    this._idleTime$.next(initialIdleTime);
    this.idlePollInterval = window.setInterval(() => {
      const delta = Date.now() - idleStart;
      this._idleTime$.next(initialIdleTime + delta);
    }, IDLE_POLL_INTERVAL);
  }

  cancelIdlePoll() {
    if (this.idlePollInterval) {
      window.clearInterval(this.idlePollInterval);
      this._idleTime$.next(0);
    }
  }
}
