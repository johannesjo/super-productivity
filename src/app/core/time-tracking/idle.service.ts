import { Injectable } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { ChromeExtensionInterfaceService } from '../chrome-extension-interface/chrome-extension-interface.service';
import { ProjectService } from '../../project/project.service';
import { ElectronService } from 'ngx-electron';
import { TaskService } from '../../tasks/task.service';
import { IPC_EVENT_IDLE_TIME } from '../../../ipc-events.const';
import { MatDialog } from '@angular/material';
import { BehaviorSubject, Observable } from 'rxjs';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { ConfigService } from '../config/config.service';

const DEFAULT_MIN_IDLE_TIME = 60000;
const IDLE_POLL_INTERVAL = 1000;

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  public isIdle = false;

  private _idleTime$: BehaviorSubject<number> = new BehaviorSubject(0);
  public idleTime$: Observable<number> = this._idleTime$.asObservable();

  private lastCurrentTaskId: string;
  private isIdleDialogOpen = false;
  private idlePollInterval: number;

  constructor(
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _taskService: TaskService,
    private _configService: ConfigService,
    private _matDialog: MatDialog,
  ) {
  }

  init() {
    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.on(IPC_EVENT_IDLE_TIME, (ev, idleTimeInMs) => {
        this.handleIdle(idleTimeInMs);
      });
    }
    this._chromeExtensionInterface.isReady$.subscribe(() => {
      this._chromeExtensionInterface.addEventListener(IPC_EVENT_IDLE_TIME, (ev, idleTimeInMs) => {
        this.handleIdle(idleTimeInMs);
      });
    });

    // window.setTimeout(() => {
    //   this.handleIdle(8000);
    // }, 300);
  }

  handleIdle(idleTime) {
    console.log('IDLE_TIME', idleTime);
    const cfg = this._configService.cfg.misc;
    const minIdleTime = cfg.minIdleTime || DEFAULT_MIN_IDLE_TIME;

    // don't run if option is not enabled
    if (!cfg.isEnableIdleTimeTracking || !(cfg.isOnlyOpenIdleWhenCurrentTask && !this._taskService.currentTaskId)) {
      this.isIdle = false;
      return;
    }
    if (idleTime > minIdleTime) {
      this.isIdle = true;

      if (!this.isIdleDialogOpen) {
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
          data: {
            lastCurrentTaskId: this.lastCurrentTaskId,
            idleTime$: this.idleTime$,
          }
        }).afterClosed()
          .subscribe((taskToTrack) => {
            if (taskToTrack) {
              this._taskService.addTimeSpent(taskToTrack, this._idleTime$.getValue());
              this._taskService.setCurrentId(taskToTrack);
            }
            this.cancelIdlePoll();
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
