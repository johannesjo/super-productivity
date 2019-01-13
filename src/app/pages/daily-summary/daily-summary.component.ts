import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TaskService } from '../../features/tasks/task.service';
import { getTodayStr } from '../../features/tasks/util/get-today-str';
import { TaskWithSubTasks } from '../../features/tasks/task.model';
import { Router } from '@angular/router';
import { IS_ELECTRON } from '../../app.constants';
import { DialogGoogleExportTimeComponent } from '../../features/google/dialog-google-export-time/dialog-google-export-time.component';
import { MatDialog } from '@angular/material';
import { DialogSimpleTaskSummaryComponent } from '../../features/simple-task-summary/dialog-simple-task-summary/dialog-simple-task-summary.component';
import { Subscription } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { IPC_SHUTDOWN_NOW } from '../../../ipc-events.const';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { NoteService } from '../../features/note/note.service';
import { ConfigService } from '../../features/config/config.service';
import { GoogleDriveSyncService } from '../../features/google/google-drive-sync.service';
import { SnackService } from '../../core/snack/snack.service';
import { takeUntil } from 'rxjs/operators';

const SUCCESS_ANIMATION_DURATION = 500;

@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailySummaryComponent implements OnInit, OnDestroy {
  public cfg = {
    isBlockFinishDayUntilTimeTimeTracked: false
  };
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

  private _successAnimationTimeout;
  private _doneTasks: TaskWithSubTasks[];
  private _todaysTasks: TaskWithSubTasks[];

  // calc time spent on todays tasks today
  private _subs: Subscription = new Subscription();

  constructor(
    private readonly _taskService: TaskService,
    private readonly _configService: ConfigService,
    private readonly _googleDriveSync: GoogleDriveSyncService,
    private readonly _router: Router,
    private readonly _noteService: NoteService,
    private readonly _matDialog: MatDialog,
    private readonly _snackService: SnackService,
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

    // we need to wait, otherwise data would get overwritten
    this._subs.add(this._taskService.isDataLoaded$.pipe(
      takeUntil(this._taskService.isDataLoaded$)
    ).subscribe(() => {
      this._taskService.setCurrentId(null);
    }));

    setTimeout(() => {
      this.showExportModal();
    }, 1000);
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    // should not happen, but just in case
    if (this._successAnimationTimeout) {
      window.clearTimeout(this._successAnimationTimeout);
    }
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
    this._taskService.moveToArchive(this._doneTasks);
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
            this._finishDayForGood(() => {
              // this._electronService.ipcRenderer.send(IPC_SHUTDOWN);
              this._electronService.ipcRenderer.send(IPC_SHUTDOWN_NOW);
            });
          } else if (isConfirm === false) {
            this._finishDayForGood(() => {
              this._router.navigate(['/work-view']);
            });
          }
        });
    } else {
      this._finishDayForGood(() => {
        // $state.go('work-view');
        this._router.navigate(['/work-view']);
      });
    }
  }


  private _finishDayForGood(cb?) {
    if (this.tomorrowsNote && this.tomorrowsNote.trim().length > 0) {
      this._noteService.add({
        content: this.tomorrowsNote,
      });
    }
    this._googleDriveSync.saveForSyncIfEnabled(true)
      .then(() => {
        this._initSuccessAnimation(cb);
      })
      .catch(() => {
        this._snackService.open({
          type: 'ERROR',
          message: 'GoogleSync: Unable to finish day, because syncing throw an error',
        });
      });
  }

  private _initSuccessAnimation(cb?) {
    this.showSuccessAnimation = true;
    this._cd.detectChanges();
    this._successAnimationTimeout = window.setTimeout(() => {
      this.showSuccessAnimation = false;
      this._cd.detectChanges();
      if (cb) {
        cb();
      }
    }, SUCCESS_ANIMATION_DURATION);
  }
}
