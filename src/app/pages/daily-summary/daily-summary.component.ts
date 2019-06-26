import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TaskService } from '../../features/tasks/task.service';
import { getTodayStr } from '../../features/tasks/util/get-today-str';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { Router } from '@angular/router';
import { IS_ELECTRON } from '../../app.constants';
import { MatDialog } from '@angular/material/dialog';
import { DialogSimpleTaskExportComponent } from '../../features/simple-task-export/dialog-simple-task-export/dialog-simple-task-export.component';
import { Observable, Subscription } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { IPC_SHUTDOWN_NOW } from '../../../../electron/ipc-events.const';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { NoteService } from '../../features/note/note.service';
import { ConfigService } from '../../features/config/config.service';
import { GoogleDriveSyncService } from '../../features/google/google-drive-sync.service';
import { SnackService } from '../../core/snack/snack.service';
import { filter, map, take } from 'rxjs/operators';
import { loadFromLs, saveToLs } from '../../core/persistence/local-storage';
import { LS_DAILY_SUMMARY_TAB_INDEX } from '../../core/persistence/ls-keys.const';
import { GoogleApiService } from '../../features/google/google-api.service';
import { ProjectService } from '../../features/project/project.service';
import { getWorklogStr } from '../../util/get-work-log-str';
import * as moment from 'moment-mini';
import { RoundTimeOption } from '../../features/project/project.model';

const SUCCESS_ANIMATION_DURATION = 500;

@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailySummaryComponent implements OnInit, OnDestroy {
  cfg = {
    isBlockFinishDayUntilTimeTimeTracked: false
  };
  doneTasks$ = this._taskService.doneTasks$;
  todaysTasks$ = this._taskService.todaysTasks$;
  todaysWorkedOnOrDoneTasksFlat$ = this._taskService.todaysWorkedOnOrDoneTasksFlat$;
  todayStr = getTodayStr();
  isTimeSheetExported = true;
  showSuccessAnimation;
  selectedTabIndex = loadFromLs(this.getLsKeyForSummaryTabIndex()) || 0;

  // calc total time spent on todays tasks
  estimatedOnTasksWorkedOnToday$ = this._taskService.estimatedOnTasksWorkedOnToday$;
  // use mysql date as it is sortable
  workingToday$ = this._taskService.workingToday$;

  started$ = this._projectService.workStartToday$;
  end$ = this._projectService.workEndToday$;
  breakTime$ = this._projectService.breakTimeToday$;
  breakNr$ = this._projectService.breakNrToday$;
  isBreakSupport$: Observable<boolean> = this._configService.cfg$.pipe(map(cfg => cfg && cfg.misc.isEnableIdleTimeTracking));

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
    private readonly _projectService: ProjectService,
    private readonly _googleApiService: GoogleApiService,
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
    this._subs.add(this._taskService.currentTaskId$.pipe(
      filter(id => !!id),
      take(1),
    ).subscribe(() => {
      this._taskService.setCurrentId(null);
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    // should not happen, but just in case
    if (this._successAnimationTimeout) {
      window.clearTimeout(this._successAnimationTimeout);
    }
  }

  onEvaluationSave() {
    this.selectedTabIndex = 1;
  }

  showExportModal() {
    this._matDialog.open(DialogSimpleTaskExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        tasks: this._todaysTasks,
      }
    });
  }

  finishDay() {
    this._taskService.moveToArchive(this._doneTasks);
    this._projectService.setDayCompleted(null, getWorklogStr());

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

  updateWorkStart(ev) {
    const startTime = moment(getWorklogStr() + ' ' + ev).unix() * 1000;
    if (startTime) {
      this._projectService.updateWorkStart(this._projectService.currentId, getWorklogStr(), startTime);
    }
  }

  updateWorkEnd(ev) {
    const endTime = moment(getWorklogStr() + ' ' + ev).unix() * 1000;
    if (endTime) {
      this._projectService.updateWorkEnd(this._projectService.currentId, getWorklogStr(), endTime);
    }
  }

  updateTimeSpentTodayForTask(task: Task, newVal: number | string) {
    this._taskService.update(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [getTodayStr()]: +newVal,
      }
    });
  }

  roundTimeForTasks(roundTo: RoundTimeOption, isRoundUp = false) {
    this._taskService.roundTimeSpentForDay(getWorklogStr(), roundTo, isRoundUp);
  }

  onTabIndexChange(i) {
    saveToLs(this.getLsKeyForSummaryTabIndex(), i);
  }

  private getLsKeyForSummaryTabIndex() {
    return LS_DAILY_SUMMARY_TAB_INDEX + this._projectService.currentId;
  }

  private _finishDayForGood(cb?) {
    if (this._configService.cfg
      && this._configService.cfg.googleDriveSync.isEnabled
      && this._configService.cfg.googleDriveSync.isAutoSyncToRemote) {
      // login in again, will hopefully prevent google errors
      // this._googleApiService.login().then(() => {
      this._googleDriveSync.saveForSync();
      this._subs.add(this._googleDriveSync.onSaveEnd$.pipe(take(1)).subscribe(() => {
        this._initSuccessAnimation(cb);
      }));
      // });
    } else {
      this._initSuccessAnimation(cb);
    }
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
