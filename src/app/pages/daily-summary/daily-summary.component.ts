import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {TaskService} from '../../features/tasks/task.service';
import {TaskWithSubTasks} from '../../features/tasks/task.model';
import {ActivatedRoute, Router} from '@angular/router';
import {IS_ELECTRON} from '../../app.constants';
import {MatDialog} from '@angular/material/dialog';
import {DialogSimpleTaskExportComponent} from '../../features/simple-task-export/dialog-simple-task-export/dialog-simple-task-export.component';
import {combineLatest, Observable, Subscription} from 'rxjs';
import {ElectronService} from 'ngx-electron';
import {IPC_SHUTDOWN_NOW} from '../../../../electron/ipc-events.const';
import {DialogConfirmComponent} from '../../ui/dialog-confirm/dialog-confirm.component';
import {NoteService} from '../../features/note/note.service';
import {ConfigService} from '../../features/config/config.service';
import {GoogleDriveSyncService} from '../../features/google/google-drive-sync.service';
import {SnackService} from '../../core/snack/snack.service';
import {filter, map, shareReplay, startWith, switchMap, take} from 'rxjs/operators';
import {GoogleApiService} from '../../features/google/google-api.service';
import {ProjectService} from '../../features/project/project.service';
import {getWorklogStr} from '../../util/get-work-log-str';
import * as moment from 'moment-mini';
import {RoundTimeOption} from '../../features/project/project.model';

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

  doneTasks$: Observable<TaskWithSubTasks[]> = this._taskService.doneTasks$;
  todaysTasks$: Observable<TaskWithSubTasks[]> = this._taskService.todaysTasks$;

  isTimeSheetExported = true;
  showSuccessAnimation;
  selectedTabIndex = 0;
  isForToday = true;

  dayStr = getWorklogStr();

  dayStr$ = combineLatest(
    this._activatedRoute.paramMap,
    this._projectService.isRelatedDataLoadedForCurrentProject$,
  ).pipe(
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
    shareReplay()
  );

  tasksWorkedOnOrDoneFlat$ = this.dayStr$.pipe(
    switchMap((dayStr) => this._taskService.getTasksWorkedOnOrDoneFlat$(dayStr)),
    shareReplay(),
  );
  hasTasksForToday$: Observable<boolean> = this.tasksWorkedOnOrDoneFlat$.pipe(map(tasks => tasks && !!tasks.length));

  nrOfDoneTasks$: Observable<number> = this.tasksWorkedOnOrDoneFlat$.pipe(
    map(tasks => tasks && tasks.filter(task => !!task.isDone).length),
  );

  totalNrOfTasks$: Observable<number> = this.tasksWorkedOnOrDoneFlat$.pipe(
    map(tasks => tasks && tasks.length),
  );

  estimatedOnTasksWorkedOn$ = this.dayStr$.pipe(switchMap((dayStr) => this._taskService.getTimeEstimateForDay$(dayStr)));

  timeWorked$ = this.dayStr$.pipe(switchMap((dayStr) => this._taskService.getTimeWorkedForDay$(dayStr)));

  started$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getWorkStart$(dayStr)));
  end$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getWorkEnd$(dayStr)));
  breakTime$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getBreakTime$(dayStr)));
  breakNr$ = this.dayStr$.pipe(switchMap((dayStr) => this._projectService.getBreakNr$(dayStr)));

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
    private readonly _activatedRoute: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    // TODO fix
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
    this._projectService.updateLastCompletedDay(this._projectService.currentId, this.dayStr);

    if (IS_ELECTRON && this.isForToday) {
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
