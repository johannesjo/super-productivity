import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {TaskService} from '../../features/tasks/task.service';
import {TaskWithSubTasks} from '../../features/tasks/task.model';
import {ActivatedRoute, Router} from '@angular/router';
import {IS_ELECTRON} from '../../app.constants';
import {MatDialog} from '@angular/material/dialog';
import {combineLatest, Observable, Subscription} from 'rxjs';
import {IPC} from '../../../../electron/ipc-events.const';
import {DialogConfirmComponent} from '../../ui/dialog-confirm/dialog-confirm.component';
import {NoteService} from '../../features/note/note.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {GoogleDriveSyncService} from '../../features/google/google-drive-sync.service';
import {SnackService} from '../../core/snack/snack.service';
import {filter, map, shareReplay, startWith, switchMap, take, tap} from 'rxjs/operators';
import {GoogleApiService} from '../../features/google/google-api.service';
import {ProjectService} from '../../features/project/project.service';
import {getWorklogStr} from '../../util/get-work-log-str';
import * as moment from 'moment';
import {RoundTimeOption} from '../../features/project/project.model';
import {T} from '../../t.const';
import {WorklogService} from '../../features/worklog/worklog.service';
import {DialogWorklogExportComponent} from '../../features/worklog/dialog-worklog-export/dialog-worklog-export.component';
import {ElectronService} from '../../core/electron/electron.service';
import {WorkContextService} from '../../features/work-context/work-context.service';

const SUCCESS_ANIMATION_DURATION = 500;

@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailySummaryComponent implements OnInit, OnDestroy {
  T = T;

  cfg = {
    isBlockFinishDayUntilTimeTimeTracked: false
  };

  doneAndRepeatingTasks$: Observable<TaskWithSubTasks[]> = combineLatest([
    this._taskService.allRepeatableTasks$,
    this._workContextService.doneTasks$,
  ]).pipe(
    map(([repeatableTasks, doneTasks]) => [
      ...repeatableTasks,
      ...doneTasks.filter(task => !task.repeatCfgId || task.repeatCfgId === null),
    ]),
  );

  isTimeSheetExported = true;
  showSuccessAnimation;
  selectedTabIndex = 0;
  isForToday = true;

  dayStr = getWorklogStr();

  dayStr$ = combineLatest([
    this._activatedRoute.paramMap,
    this._projectService.isRelatedDataLoadedForCurrentProject$,
  ]).pipe(
    filter(([route, isLoaded]) => isLoaded),
    map(([route]) => route),
    startWith({params: {dayStr: getWorklogStr()}}),
    map((s: any) => {
      if (s && s.params.dayStr) {
        return s.params.dayStr;
      } else {
        return getWorklogStr();
      }
    }),
    shareReplay(1)
  );

  tasksWorkedOnOrDoneOrRepeatableFlat$ = this.dayStr$.pipe(
    switchMap((dayStr) => this._workContextService.getTasksWorkedOnOrDoneOrRepeatableFlat$(dayStr)),
    shareReplay(1),
  );

  hasTasksForToday$: Observable<boolean> = this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(map(tasks => tasks && !!tasks.length));

  nrOfDoneTasks$: Observable<number> = this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(
    map(tasks => tasks && tasks.filter(task => !!task.isDone).length),
  );

  totalNrOfTasks$: Observable<number> = this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(
    map(tasks => tasks && tasks.length),
  );

  estimatedOnTasksWorkedOn$ = this.dayStr$.pipe(switchMap((dayStr) => this._workContextService.getTimeEstimateForDay$(dayStr)));

  timeWorked$ = this.dayStr$.pipe(switchMap((dayStr) => this._workContextService.getTimeWorkedForDay$(dayStr)));

  started$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getWorkStart$(dayStr)));
  end$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getWorkEnd$(dayStr)));
  breakTime$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getBreakTime$(dayStr)));
  breakNr$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getBreakNr$(dayStr)));

  isBreakTrackingSupport$: Observable<boolean> = this.configService.idle$.pipe(map(cfg => cfg && cfg.isEnableIdleTimeTracking));

  private _successAnimationTimeout;

  // calc time spent on todays tasks today
  private _subs: Subscription = new Subscription();

  constructor(
    public readonly configService: GlobalConfigService,
    private readonly _taskService: TaskService,
    private readonly _googleDriveSync: GoogleDriveSyncService,
    private readonly _router: Router,
    private readonly _noteService: NoteService,
    private readonly _matDialog: MatDialog,
    private readonly _snackService: SnackService,
    private readonly _workContextService: WorkContextService,
    private readonly _projectService: ProjectService,
    private readonly _googleApiService: GoogleApiService,
    private readonly _electronService: ElectronService,
    private readonly _worklogService: WorklogService,
    private readonly _cd: ChangeDetectorRef,
    private readonly _activatedRoute: ActivatedRoute,
  ) {
    this._taskService.setSelectedId(null);
  }

  ngOnInit() {
    // we need to wait, otherwise data would get overwritten
    this._subs.add(this._taskService.currentTaskId$.pipe(
      filter(id => !!id),
      take(1),
    ).subscribe(() => {
      this._taskService.setCurrentId(null);
    }));

    this._subs.add(this._activatedRoute.paramMap.subscribe((s: any) => {
        if (s && s.params.dayStr) {
          this.isForToday = false;
          this.dayStr = s.params.dayStr;
        }
      })
    );
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
    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        rangeStart: new Date().setHours(0, 0, 0, 0),
        rangeEnd: new Date().setHours(23, 59, 59),
      }
    });
  }

  async finishDay() {
    const doneAndRepeatingTasks = await this.doneAndRepeatingTasks$.pipe(take(1)).toPromise();

    this._taskService.moveToArchive(doneAndRepeatingTasks);
    this._projectService.updateLastCompletedDay(this._projectService.currentId, this.dayStr);

    if (IS_ELECTRON && this.isForToday) {
      this._matDialog.open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          okTxt: T.PDS.D_CONFIRM_APP_CLOSE.OK,
          cancelTxt: T.PDS.D_CONFIRM_APP_CLOSE.CANCEL,
          message: T.PDS.D_CONFIRM_APP_CLOSE.MSG,
        }
      }).afterClosed()
        .subscribe((isConfirm: boolean) => {
          if (isConfirm) {
            this._finishDayForGood(() => {
              // this._electronService.ipcRenderer.send(IPC.SHUTDOWN);
              this._electronService.ipcRenderer.send(IPC.SHUTDOWN_NOW);
            });
          } else if (isConfirm === false) {
            this._finishDayForGood(() => {
              this._router.navigate(['/active/tasks']);
            });
          }
        });
    } else {
      this._finishDayForGood(() => {
        this._router.navigate(['/active/tasks']);
      });
    }
  }

  updateWorkStart(ev) {
    const startTime = moment(this.dayStr + ' ' + ev).unix() * 1000;
    if (startTime) {
      this._projectService.updateWorkStart(this._projectService.currentId, this.dayStr, startTime);
    }
  }

  updateWorkEnd(ev) {
    const endTime = moment(this.dayStr + ' ' + ev).unix() * 1000;
    if (endTime) {
      this._projectService.updateWorkEnd(this._projectService.currentId, this.dayStr, endTime);
    }
  }

  roundTimeForTasks(roundTo: RoundTimeOption, isRoundUp = false) {
    this._taskService.roundTimeSpentForDay(this.dayStr, roundTo, isRoundUp);
  }

  onTabIndexChange(i) {
    this.selectedTabIndex = i;
  }

  onTaskSummaryEdit() {
    this._worklogService.refreshWorklog();
  }

  private _finishDayForGood(cb?) {
    if (this.configService.cfg
      && this.configService.cfg.googleDriveSync.isEnabled
      && this.configService.cfg.googleDriveSync.isAutoSyncToRemote) {
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
