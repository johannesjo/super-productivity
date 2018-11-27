import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { getTodayStr } from '../../tasks/util/get-today-str';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { Router } from '@angular/router';
import { IS_ELECTRON } from '../../app.constants';
import { DialogGoogleExportTimeComponent } from '../../core/google/dialog-google-export-time/dialog-google-export-time.component';
import { MatDialog } from '@angular/material';
import { DialogSimpleTaskSummaryComponent } from '../../core/dialog-simple-task-summary/dialog-simple-task-summary.component';
import { Subscription } from 'rxjs';
import { ProjectService } from '../../project/project.service';
import { ElectronService } from 'ngx-electron';
import { IPC_SHUTDOWN, IPC_SHUTDOWN_NOW } from '../../../ipc-events.const';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';

const SUCCESS_ANIMATION_DURATION = 500;

@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailySummaryComponent implements OnInit, OnDestroy {
  public cfg: any = {};
  public doneTasks$ = this._taskService.doneTasks$;
  public todaysTasks$ = this._taskService.todaysTasks$;
  public todayStr = getTodayStr();
  public tomorrowsNote: string;
  public clearDoneTasks: boolean;
  public moveUnfinishedToBacklog: boolean;
  public commitLog;
  public isTimeSheetExported = true;
  public showSuccessAnimation;
  // calc total time spent on todays tasks
  totalTimeSpentTasks$ = this._taskService.totalTimeWorkedOnTodaysTasks$;
  // use mysql date as it is sortable
  workingToday$ = this._taskService.workingToday$;
  private successAnimationTimeout;
  private _doneTasks: TaskWithSubTasks[];
  private _todaysTasks: TaskWithSubTasks[];

  // calc time spent on todays tasks today
  private _subs: Subscription = new Subscription();

  constructor(
    private readonly _taskService: TaskService,
    private readonly _projectService: ProjectService,
    private readonly _router: Router,
    private readonly _matDialog: MatDialog,
    private readonly _electronService: ElectronService,
    private readonly _cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    this._subs.add(this.doneTasks$.subscribe((val) => {
      this._doneTasks = val;
    }));

    this._subs.add(this.todaysTasks$.subscribe((val) => {
      this._todaysTasks = val;
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  showExportModal() {
    this._matDialog.open(DialogSimpleTaskSummaryComponent, {
      restoreFocus: true,
      data: {
        tasks: this._todaysTasks,
      }
    });
  }

  showTimeSheetExportModal() {
    this._matDialog.open(DialogGoogleExportTimeComponent, {
      restoreFocus: true,
    });
  }

  finishDay() {
    const idsToMove = this._doneTasks.map((task) => task.id);
    this._taskService.moveToArchive(idsToMove);
    if (IS_ELECTRON) {
      this._matDialog.open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          okTxt: 'Aye aye! Shutdown!',
          cancelTxt: 'No, just clear the tasks',
          message: `You work is done. Time to go home!`,
        }
      }).afterClosed()
        .subscribe((isConfirm: boolean) => {
          if (isConfirm) {
            this._initSuccessAnimation(() => {
              // this._electronService.ipcRenderer.send(IPC_SHUTDOWN);
              this._electronService.ipcRenderer.send(IPC_SHUTDOWN_NOW);
            });
          } else if (isConfirm === false) {
            this._initSuccessAnimation(() => {
              this._router.navigate(['/work-view']);
            });
          }
        });
    } else {
      // if (this._projectService.current && GoogleDriveSync.config.isAutoSyncToRemote) {
      //   SimpleToast('CUSTOM', `Syncing Data to Google Drive.`, 'file_upload');
      //   GoogleDriveSync.saveTo();
      // }
      this._initSuccessAnimation(() => {
        // $state.go('work-view');
        this._router.navigate(['/work-view']);
      });
    }
  }


  private _initSuccessAnimation(cb) {
    this.showSuccessAnimation = true;
    this.successAnimationTimeout = window.setTimeout(() => {
      this.showSuccessAnimation = false;
      this._cd.detectChanges();
      if (cb) {
        cb();
      }
    }, SUCCESS_ANIMATION_DURATION);
  }
}
