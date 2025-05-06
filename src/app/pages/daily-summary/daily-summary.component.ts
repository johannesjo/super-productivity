import confetti from 'canvas-confetti';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  linkedSignal,
  OnDestroy,
  OnInit,
  Signal,
} from '@angular/core';
import { TaskService } from '../../features/tasks/task.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IS_ELECTRON } from '../../app.constants';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, from, merge, Observable, Subject } from 'rxjs';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { GlobalConfigService } from '../../features/config/global-config.service';
import {
  delay,
  filter,
  first,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from 'rxjs/operators';
import moment from 'moment';
import { T } from '../../t.const';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { SyncWrapperService } from '../../imex/sync/sync-wrapper.service';
import { isToday, isYesterday } from '../../util/is-today.util';
import { WorklogService } from '../../features/worklog/worklog.service';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { EntityState } from '@ngrx/entity';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { shareReplayUntil } from '../../util/share-replay-until';
import { DateService } from 'src/app/core/date/date.service';
import { Action } from '@ngrx/store';
import { BeforeFinishDayService } from '../../features/before-finish-day/before-finish-day.service';
import { MatAnchor, MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { InlineInputComponent } from '../../ui/inline-input/inline-input.component';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PlanTasksTomorrowComponent } from './plan-tasks-tomorrow/plan-tasks-tomorrow.component';
import { MatTooltip } from '@angular/material/tooltip';
import { AsyncPipe } from '@angular/common';
import { MomentFormatPipe } from '../../ui/pipes/moment-format.pipe';
import { MsToClockStringPipe } from '../../ui/duration/ms-to-clock-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { TaskSummaryTablesComponent } from '../../features/tasks/task-summary-tables/task-summary-tables.component';
import { TasksByTagComponent } from '../../features/tasks/tasks-by-tag/tasks-by-tag.component';
import { RightPanelComponent } from '../../features/right-panel/right-panel.component';
import { EvaluationSheetComponent } from '../../features/metric/evaluation-sheet/evaluation-sheet.component';
import { WorklogWeekComponent } from '../../features/worklog/worklog-week/worklog-week.component';
import { InlineMarkdownComponent } from '../../ui/inline-markdown/inline-markdown.component';
import { unToggleCheckboxesInMarkdownTxt } from '../../util/untoggle-checkboxes-in-markdown-txt';
import { expandAnimation } from '../../ui/animations/expand.ani';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { getSimpleCounterStreakDuration } from '../../features/simple-counter/get-simple-counter-streak-duration';
import {
  SimpleCounterSummaryItem,
  SimpleCounterSummaryItemComponent,
} from './simple-counter-summary-item/simple-counter-summary-item.component';
import { promiseTimeout } from '../../util/promise-timeout';
import { TaskArchiveService } from '../../features/time-tracking/task-archive.service';
import { IS_TOUCH_ONLY } from '../../util/is-touch-only';

const SUCCESS_ANIMATION_DURATION = 500;
const MAGIC_YESTERDAY_MARGIN = 4 * 60 * 60 * 1000;

@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatAnchor,
    RouterLink,
    MatIcon,
    InlineInputComponent,
    MatTabGroup,
    MatTab,
    MatProgressSpinner,
    PlanTasksTomorrowComponent,
    MatButton,
    MatTooltip,
    AsyncPipe,
    MomentFormatPipe,
    MsToClockStringPipe,
    TranslatePipe,
    TaskSummaryTablesComponent,
    TasksByTagComponent,
    RightPanelComponent,
    EvaluationSheetComponent,
    WorklogWeekComponent,
    InlineMarkdownComponent,
    MatIconButton,
    SimpleCounterSummaryItemComponent,
  ],
  animations: [expandAnimation],
})
export class DailySummaryComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly configService = inject(GlobalConfigService);
  readonly workContextService = inject(WorkContextService);
  private readonly _taskService = inject(TaskService);
  private readonly _router = inject(Router);
  private readonly _matDialog = inject(MatDialog);
  private readonly _taskArchiveService = inject(TaskArchiveService);
  private readonly _worklogService = inject(WorklogService);
  private readonly _cd = inject(ChangeDetectorRef);
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _syncWrapperService = inject(SyncWrapperService);
  private readonly _beforeFinishDayService = inject(BeforeFinishDayService);
  private readonly _simpleCounterService = inject(SimpleCounterService);
  private readonly _dateService = inject(DateService);

  T: typeof T = T;
  _onDestroy$ = new Subject<void>();

  readonly isIncludeYesterday: boolean;
  isTimeSheetExported: boolean = true;
  showSuccessAnimation: boolean = false;
  selectedTabIndex: number = 0;
  isForToday: boolean = true;

  // TODO remove one?
  dayStr: string = this._dateService.todayStr();

  dayStr$: Observable<string> = this._activatedRoute.paramMap.pipe(
    startWith({
      params: { dayStr: this._dateService.todayStr() },
    }),
    map((s: any) => {
      if (s && s.params.dayStr) {
        return s.params.dayStr;
      } else {
        return this._dateService.todayStr();
      }
    }),
    shareReplayUntil(this._onDestroy$, 1),
  );

  cfg$ = this.configService.cfg$;

  private _enabledSimpleCounters = toSignal(
    this._simpleCounterService.enabledSimpleCounters$,
    { initialValue: [] },
  );

  simpleCounterSummaryItems: Signal<SimpleCounterSummaryItem[]> = computed(() => {
    return this._enabledSimpleCounters().map((sc) => ({
      ...sc,
      streakDuration: getSimpleCounterStreakDuration(sc),
    }));
  });

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

  started$: Observable<number | undefined> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getWorkStart$(dayStr)),
  );
  end$: Observable<number | undefined> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getWorkEnd$(dayStr)),
  );

  breakTime$: Observable<number | undefined> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getBreakTime$(dayStr)),
  );
  breakNr$: Observable<number | undefined> = this.dayStr$.pipe(
    switchMap((dayStr) => this.workContextService.getBreakNr$(dayStr)),
  );

  isBreakTrackingSupport$: Observable<boolean> = this.configService.idle$.pipe(
    map((cfg) => cfg && cfg.isEnableIdleTimeTracking),
  );

  actionsToExecuteBeforeFinishDay: Action[] = [{ type: 'FINISH_DAY' }];

  cfg = toSignal(this.cfg$);
  dailySummaryNoteTxt = linkedSignal(() => this.cfg()?.dailySummaryNote?.txt);

  private _successAnimationTimeout?: number;
  private _startCelebrationTimeout?: number;
  private _celebrationIntervalId?: number;

  constructor() {
    this._taskService.setSelectedId(null);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    this.isIncludeYesterday = Date.now() - todayStart.getTime() <= MAGIC_YESTERDAY_MARGIN;

    if (
      this.configService.cfg?.dailySummaryNote?.txt &&
      this.configService.cfg?.dailySummaryNote?.lastUpdateDayStr !==
        this._dateService.todayStr()
    ) {
      this.dailySummaryNoteTxt.set(
        unToggleCheckboxesInMarkdownTxt(this.configService.cfg.dailySummaryNote.txt),
      );
    }
  }

  ngOnInit(): void {
    // we need to wait, otherwise data would get overwritten
    this._taskService.currentTaskId$
      .pipe(
        takeUntil(this._onDestroy$),
        filter((id) => !!id),
        take(1),
      )
      .subscribe(() => {
        this._taskService.setCurrentId(null);
      });

    this._activatedRoute.paramMap
      .pipe(takeUntil(this._onDestroy$))
      .subscribe((s: any) => {
        if (s && s.params.dayStr) {
          this.isForToday = false;
          this.dayStr = s.params.dayStr;
        }
      });
  }

  ngAfterViewInit(): void {
    this._startCelebrationTimeout = window.setTimeout(
      () => {
        this._celebrate();
      },
      IS_TOUCH_ONLY ? 1500 : 500,
    );
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
    // should not happen, but just in case
    window.clearTimeout(this._successAnimationTimeout);
    window.clearTimeout(this._startCelebrationTimeout);
    window.clearInterval(this._celebrationIntervalId);
  }

  onEvaluationSave(): void {
    this.selectedTabIndex = 1;
  }

  async finishDay(): Promise<void> {
    await this._beforeFinishDayService.executeActions();
    if (IS_ELECTRON && this.isForToday) {
      const isConfirm = await this._matDialog
        .open(DialogConfirmComponent, {
          restoreFocus: true,
          data: {
            okTxt: T.PDS.D_CONFIRM_APP_CLOSE.OK,
            cancelTxt: T.PDS.D_CONFIRM_APP_CLOSE.CANCEL,
            message: T.PDS.D_CONFIRM_APP_CLOSE.MSG,
          },
        })
        .afterClosed()
        .pipe(first())
        .toPromise();

      // dialog was just clicked away
      if (isConfirm === undefined) {
        return;
      } else if (isConfirm === true) {
        await this._moveDoneToArchive();
        this._finishDayForGood(() => {
          window.ea.shutdownNow();
        });
      } else if (isConfirm === false) {
        await this._moveDoneToArchive();
        this._finishDayForGood(() => {
          this._router.navigate(['/active/tasks']);
        });
      }
    } else {
      await this._moveDoneToArchive();
      this._finishDayForGood(() => {
        this._router.navigate(['/active/tasks']);
      });
    }
  }

  updateWorkStart(ev: string): void {
    const startTime = moment(this.dayStr + ' ' + ev).unix() * 1000;
    if (startTime) {
      this.workContextService.updateWorkStartForActiveContext(this.dayStr, startTime);
    }
  }

  updateWorkEnd(ev: string): void {
    const endTime = moment(this.dayStr + ' ' + ev).unix() * 1000;
    if (endTime) {
      this.workContextService.updateWorkEndForActiveContext(this.dayStr, endTime);
    }
  }

  onTabIndexChange(i: number): void {
    this.selectedTabIndex = i;
  }

  updateDailySummaryTxt(txt?: string, isForceShow = false): void {
    this.configService.updateSection(
      'dailySummaryNote',
      {
        txt: (!txt || txt.length === 0) && !isForceShow ? undefined : txt,
        lastUpdateDayStr: this._dateService.todayStr(),
      },
      true,
    );
  }

  private async _moveDoneToArchive(): Promise<void> {
    const doneTasks = await this.workContextService.doneTasks$.pipe(take(1)).toPromise();
    this._taskService.moveToArchive(doneTasks);
    // wait for tasks being actually moved to archive and all database stuff to be completed...
    await promiseTimeout(50);
  }

  private async _finishDayForGood(cb?: any): Promise<void> {
    const syncCfg = this.configService.cfg?.sync;
    if (syncCfg?.isEnabled) {
      await this._syncWrapperService.sync();
    }
    this._initSuccessAnimation(cb);
  }

  private _initSuccessAnimation(cb?: any): void {
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
    const _isWorkedOnDoneOrDueToday = (() => {
      if (this.isIncludeYesterday) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this._dateService.todayStr(yesterday);

        return (t: Task) =>
          (t.timeSpentOnDay &&
            t.timeSpentOnDay[dayStr] &&
            t.timeSpentOnDay[dayStr] > 0) ||
          (t.timeSpentOnDay &&
            t.timeSpentOnDay[yesterdayStr] &&
            t.timeSpentOnDay[yesterdayStr] > 0) ||
          (t.dueDay && t.dueDay === dayStr) ||
          (t.isDone && t.doneOn && (isToday(t.doneOn) || isYesterday(t.doneOn)));
      } else {
        return (t: Task) =>
          (t.timeSpentOnDay &&
            t.timeSpentOnDay[dayStr] &&
            t.timeSpentOnDay[dayStr] > 0) ||
          (t.dueDay && t.dueDay === dayStr) ||
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
      const tasksI = ids.map((id) => taskState.entities[id]);

      let filteredTasks;
      if (activeId === TODAY_TAG.id) {
        filteredTasks = tasksI as Task[];
      } else if (activeType === WorkContextType.PROJECT) {
        filteredTasks = tasksI.filter(
          (task) => (task as Task).projectId === activeId,
        ) as Task[];
      } else {
        filteredTasks = tasksI.filter((task) =>
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
          const subTasks = pt.subTasks.filter((st) => _isWorkedOnDoneOrDueToday(st));
          if (subTasks.length) {
            flatTasks.push(pt);
            flatTasks = flatTasks.concat(subTasks as TaskWithSubTasks[]);
          }
        } else if (_isWorkedOnDoneOrDueToday(pt)) {
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
            .filter((st) => _isWorkedOnDoneOrDueToday(st))
            .map((t) => ({ ...t, subTasks: [] }));
          if (subTasks.length) {
            flatTasks.push(pt);
            flatTasks = flatTasks.concat(subTasks);
          }
        } else if (_isWorkedOnDoneOrDueToday(pt) || pt.repeatCfgId) {
          flatTasks.push(pt);
        }
      });
      return flatTasks;
    };

    const archiveTasks: Observable<TaskWithSubTasks[]> = merge(
      from(this._taskArchiveService.load()),
      this._worklogService.archiveUpdateManualTrigger$.pipe(
        // hacky wait for save
        delay(70),
        switchMap(() => this._taskArchiveService.load()),
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

  private _celebrate(): void {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 20, spread: 720, ticks: 600, zIndex: 0 };

    const randomInRange = (min: number, max: number): number =>
      // eslint-disable-next-line no-mixed-operators
      Math.random() * (max - min) + min;

    this._celebrationIntervalId = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return window.clearInterval(this._celebrationIntervalId);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }
}
