import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { TaskService } from '../../features/tasks/task.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IS_ELECTRON } from '../../app.constants';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, from, merge, Observable, Subscription } from 'rxjs';
import { IPC } from '../../../../electron/ipc-events.const';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { GlobalConfigService } from '../../features/config/global-config.service';
import {
  delay,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs/operators';
import { getWorklogStr } from '../../util/get-work-log-str';
import * as moment from 'moment';
import { T } from '../../t.const';
import { ElectronService } from '../../core/electron/electron.service';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { ipcRenderer } from 'electron';
import { SyncProviderService } from '../../imex/sync/sync-provider.service';
import { isToday, isYesterday } from '../../util/is-today.util';
import { WorklogService } from '../../features/worklog/worklog.service';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { EntityState } from '@ngrx/entity';
import { TODAY_TAG } from '../../features/tag/tag.const';

const SUCCESS_ANIMATION_DURATION = 500;
const MAGIC_YESTERDAY_MARGIN = 4 * 60 * 60 * 1000;

@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailySummaryComponent implements OnInit, OnDestroy {
  T: typeof T = T;

  cfg: any = {};

  readonly isIncludeYesterday: boolean;
  isTimeSheetExported: boolean = true;
  showSuccessAnimation: boolean = false;
  selectedTabIndex: number = 0;
  isForToday: boolean = true;

  // TODO remove one?
  dayStr: string = getWorklogStr();

  dayStr$: Observable<string> = this._activatedRoute.paramMap.pipe(
    startWith({ params: { dayStr: getWorklogStr() } }),
    map((s: any) => {
      if (s && s.params.dayStr) {
        return s.params.dayStr;
      } else {
        return getWorklogStr();
      }
    }),
    shareReplay(1),
  );

  tasksWorkedOnOrDoneOrRepeatableFlat$: Observable<Task[]> = this.dayStr$.pipe(
    switchMap((dayStr) => this._getDailySummaryTasksFlat$(dayStr)),
    shareReplay(1),
  );

  hasTasksForToday$: Observable<boolean> = this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(
    map((tasks) => tasks && !!tasks.length),
  );

  nrOfDoneTasks$: Observable<number> = this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(
    map((tasks) => tasks && tasks.filter((task) => !!task.isDone).length),
  );

  totalNrOfTasks$: Observable<number> = this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(
    map((tasks) => tasks && tasks.length),
  );

  estimatedOnTasksWorkedOn$: Observable<number> =
    this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(
      withLatestFrom(this.dayStr$),
      map(
        ([tasks, dayStr]: [Task[], string]): number =>
          tasks?.length &&
          tasks.reduce((acc, task) => {
            if (
              task.subTaskIds.length ||
              (!task.timeSpentOnDay && !(task.timeSpentOnDay[dayStr] > 0))
            ) {
              return acc;
            }
            const remainingEstimate =
              task.timeEstimate + task.timeSpentOnDay[dayStr] - task.timeSpent;
            return remainingEstimate > 0 ? acc + remainingEstimate : acc;
          }, 0),
      ),
    );

  timeWorked$: Observable<number> = this.tasksWorkedOnOrDoneOrRepeatableFlat$.pipe(
    withLatestFrom(this.dayStr$),
    map(
      ([tasks, dayStr]: [Task[], string]): number =>
        tasks?.length &&
        tasks.reduce((acc, task) => {
          if (task.subTaskIds.length) {
            return acc;
          }
          return (
            acc +
            (task.timeSpentOnDay && +task.timeSpentOnDay[dayStr]
              ? +task.timeSpentOnDay[dayStr]
              : 0)
          );
        }, 0),
    ),
  );

  started$: Observable<number> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getWorkStart$(dayStr)),
  );
  end$: Observable<number> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getWorkEnd$(dayStr)),
  );

  breakTime$: Observable<number> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getBreakTime$(dayStr)),
  );
  breakNr$: Observable<number> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getBreakNr$(dayStr)),
  );

  isBreakTrackingSupport$: Observable<boolean> = this.configService.idle$.pipe(
    map((cfg) => cfg && cfg.isEnableIdleTimeTracking),
  );

  private _successAnimationTimeout?: number;

  // calc time spent on todays tasks today
  private _subs: Subscription = new Subscription();

  constructor(
    public readonly configService: GlobalConfigService,
    public readonly workContextService: WorkContextService,
    private readonly _taskService: TaskService,
    private readonly _router: Router,
    private readonly _matDialog: MatDialog,
    private readonly _persistenceService: PersistenceService,
    private readonly _worklogService: WorklogService,
    private readonly _electronService: ElectronService,
    private readonly _cd: ChangeDetectorRef,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _syncProviderService: SyncProviderService,
  ) {
    this._taskService.setSelectedId(null);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    this.isIncludeYesterday = Date.now() - todayStart.getTime() <= MAGIC_YESTERDAY_MARGIN;
  }

  ngOnInit() {
    // we need to wait, otherwise data would get overwritten
    this._subs.add(
      this._taskService.currentTaskId$
        .pipe(
          filter((id) => !!id),
          take(1),
        )
        .subscribe(() => {
          this._taskService.setCurrentId(null);
        }),
    );

    this._subs.add(
      this._activatedRoute.paramMap.subscribe((s: any) => {
        if (s && s.params.dayStr) {
          this.isForToday = false;
          this.dayStr = s.params.dayStr;
        }
      }),
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

  async finishDay() {
    const doneTasks = await this.workContextService.doneTasks$.pipe(take(1)).toPromise();

    this._taskService.moveToArchive(doneTasks);

    if (IS_ELECTRON && this.isForToday) {
      this._matDialog
        .open(DialogConfirmComponent, {
          restoreFocus: true,
          data: {
            okTxt: T.PDS.D_CONFIRM_APP_CLOSE.OK,
            cancelTxt: T.PDS.D_CONFIRM_APP_CLOSE.CANCEL,
            message: T.PDS.D_CONFIRM_APP_CLOSE.MSG,
          },
        })
        .afterClosed()
        .subscribe((isConfirm: boolean) => {
          if (isConfirm) {
            this._finishDayForGood(() => {
              (this._electronService.ipcRenderer as typeof ipcRenderer).send(
                IPC.SHUTDOWN_NOW,
              );
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

  updateWorkStart(ev: string) {
    const startTime = moment(this.dayStr + ' ' + ev).unix() * 1000;
    if (startTime) {
      this.workContextService.updateWorkStartForActiveContext(this.dayStr, startTime);
    }
  }

  updateWorkEnd(ev: string) {
    const endTime = moment(this.dayStr + ' ' + ev).unix() * 1000;
    if (endTime) {
      this.workContextService.updateWorkEndForActiveContext(this.dayStr, endTime);
    }
  }

  onTabIndexChange(i: number) {
    this.selectedTabIndex = i;
  }

  private async _finishDayForGood(cb?: any) {
    const syncCfg = this.configService.cfg?.sync;
    if (syncCfg?.isEnabled) {
      await this._syncProviderService.sync();
    }
    this._initSuccessAnimation(cb);
  }

  private _initSuccessAnimation(cb?: any) {
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

  private _getDailySummaryTasksFlat$(dayStr: string): Observable<Task[]> {
    // TODO make more performant!!
    const _isWorkedOnOrDoneToday = (() => {
      if (this.isIncludeYesterday) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getWorklogStr(yesterday);

        return (t: Task) =>
          (t.timeSpentOnDay &&
            t.timeSpentOnDay[dayStr] &&
            t.timeSpentOnDay[dayStr] > 0) ||
          (t.timeSpentOnDay &&
            t.timeSpentOnDay[yesterdayStr] &&
            t.timeSpentOnDay[yesterdayStr] > 0) ||
          (t.isDone && t.doneOn && (isToday(t.doneOn) || isYesterday(t.doneOn)));
      } else {
        return (t: Task) =>
          (t.timeSpentOnDay &&
            t.timeSpentOnDay[dayStr] &&
            t.timeSpentOnDay[dayStr] > 0) ||
          (t.isDone && t.doneOn && isToday(t.doneOn));
      }
    })();

    const _mapEntities = ([taskState, { activeType, activeId }]: [
      EntityState<Task>,
      {
        activeId: string;
        activeType: WorkContextType;
      },
    ]): TaskWithSubTasks[] => {
      const ids = (taskState && (taskState.ids as string[])) || [];
      const archiveTasksI = ids.map((id) => taskState.entities[id]);
      let filteredTasks;
      if (activeId === TODAY_TAG.id) {
        filteredTasks = archiveTasksI as Task[];
      } else if (activeType === WorkContextType.PROJECT) {
        filteredTasks = archiveTasksI.filter(
          (task) => (task as Task).projectId === activeId,
        ) as Task[];
      } else {
        filteredTasks = archiveTasksI.filter((task) =>
          !!(task as Task).parentId
            ? (
                taskState.entities[(task as Task).parentId as string] as Task
              ).tagIds.includes(activeId)
            : (task as Task).tagIds.includes(activeId),
        ) as Task[];
      }
      // return filteredTasks;
      // to order sub tasks after their parents
      return filteredTasks
        .filter((task) => !task.parentId)
        .map((task) =>
          task.subTaskIds.length
            ? {
                ...task,
                subTasks: task.subTaskIds
                  .map((tid) => taskState.entities[tid])
                  .filter((t) => t),
              }
            : task,
        ) as TaskWithSubTasks[];
    };

    const _mapFilterToFlatToday = (tasks: TaskWithSubTasks[]): TaskWithSubTasks[] => {
      let flatTasks: TaskWithSubTasks[] = [];
      tasks.forEach((pt: TaskWithSubTasks) => {
        if (pt.subTasks && pt.subTasks.length) {
          const subTasks = pt.subTasks.filter((st) => _isWorkedOnOrDoneToday(st));
          if (subTasks.length) {
            flatTasks.push(pt);
            flatTasks = flatTasks.concat(subTasks as TaskWithSubTasks[]);
          }
        } else if (_isWorkedOnOrDoneToday(pt)) {
          flatTasks.push(pt);
        }
      });
      return flatTasks;
    };

    const _mapFilterToFlatOrRepeatToday = (
      tasks: TaskWithSubTasks[],
    ): TaskWithSubTasks[] => {
      let flatTasks: TaskWithSubTasks[] = [];
      tasks.forEach((pt: TaskWithSubTasks) => {
        if (pt.subTasks && pt.subTasks.length) {
          const subTasks: TaskWithSubTasks[] = pt.subTasks
            .filter((st) => _isWorkedOnOrDoneToday(st))
            .map((t) => ({ ...t, subTasks: [] }));
          if (subTasks.length) {
            flatTasks.push(pt);
            flatTasks = flatTasks.concat(subTasks);
          }
        } else if (_isWorkedOnOrDoneToday(pt) || pt.repeatCfgId) {
          flatTasks.push(pt);
        }
      });
      return flatTasks;
    };

    const archiveTasks: Observable<TaskWithSubTasks[]> = merge(
      from(this._persistenceService.taskArchive.loadState()),
      this._worklogService.archiveUpdateManualTrigger$.pipe(
        // hacky wait for save
        delay(70),
        switchMap(() => this._persistenceService.taskArchive.loadState()),
      ),
    ).pipe(
      withLatestFrom(this.workContextService.activeWorkContextTypeAndId$),
      map(_mapEntities),
      map(_mapFilterToFlatToday),
    );

    const todayTasks: Observable<TaskWithSubTasks[]> =
      this._taskService.taskFeatureState$.pipe(
        withLatestFrom(this.workContextService.activeWorkContextTypeAndId$),
        map(_mapEntities),
        map(_mapFilterToFlatOrRepeatToday),
      );

    return combineLatest([todayTasks, archiveTasks]).pipe(
      map(([t1, t2]) => t1.concat(t2)),
    );
  }
}
