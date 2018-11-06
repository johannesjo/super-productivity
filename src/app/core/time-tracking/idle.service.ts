import { Injectable } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { ChromeExtensionInterfaceService } from '../chrome-extension-interface/chrome-extension-interface.service';
import { ProjectService } from '../../project/project.service';
import { ElectronService } from 'ngx-electron';
import { TaskService } from '../../tasks/task.service';
import { IPC_EVENT_IDLE_TIME } from '../../../ipc-events.const';
import { MatDialog } from '@angular/material';
import { BehaviorSubject, Observable } from 'rxjs';

const MIN_IDLE_TIME = 5000;

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  public isIdle = false;

  private _idleTime$: BehaviorSubject<number> = new BehaviorSubject(0);
  public idleTime$: Observable<number> = this._idleTime$.asObservable();

  private isIdleDialogOpen = false;
  private idlePollInterval: number;

  constructor(
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _taskService: TaskService,
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
  }

  handleIdle(idleTimeInMs) {
    console.log('IDLE_TIME', idleTimeInMs);

    // TODO CFG
    // don't run if option is not enabled
    // if (!this.$rootScope.r.config.isEnableIdleTimeTracking) {
    //   this.isIdle = false;
    //   return;
    // }
    // const minIdleTimeInMs = moment.duration(this.$rootScope.r.config.minIdleTime)
    //   .asMilliseconds();

    if (idleTimeInMs > MIN_IDLE_TIME) {
      this.isIdle = true;
      const initialIdleTime = idleTimeInMs;
      if (this._taskService.currentTaskId) {
        // remove idle time already tracked
        this._taskService.removeTimeSpent(this._taskService.currentTaskId, initialIdleTime);
      }
      this.isIdleDialogOpen = true;
      this.initIdlePoll(initialIdleTime);
      // this.Dialogs('WAS_IDLE', {
      //   initialIdleTime: initialIdleTime,
      // })
      //   .then((res) => {
      //     // if tracked
      //     // ----------
      //     // add the idle time in milliseconds + the minIdleTime that was
      //     // not tracked or removed
      //     if (res.selectedTask && res.selectedTask.id) {
      //       this.Tasks.addTimeSpent(res.selectedTask, this.idleTime);
      //       // set current task to the selected one
      //       this.Tasks.updateCurrent(res.selectedTask);
      //     } else {
      //       console.error('No Task selected');
      //     }
      //
      //     this.TakeABreakReminder.isShown = true;
      //     this.isIdleDialogOpen = false;
      //     this.cancelIdlePoll();
      //   }, () => {
      //     this.isIdleDialogOpen = false;
      //     this.cancelIdlePoll();
      //   });
    }
  }


  initIdlePoll(initialIdleTime) {
    const POLL_INTERVAL = 1000;
    const idleStart = Date.now();
    this._idleTime$.next(initialIdleTime);
    this.idlePollInterval = window.setInterval(() => {
      const delta = Date.now() - idleStart;
      this._idleTime$.next(initialIdleTime + delta);
    }, POLL_INTERVAL);
  }

  cancelIdlePoll() {
    if (this.idlePollInterval) {
      window.clearInterval(this.idlePollInterval);
      this._idleTime$.next(0);
    }
  }
}
