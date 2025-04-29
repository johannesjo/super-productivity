import { inject, Injectable } from '@angular/core';
import {
  TaskCopy,
  TaskPlannedWithDayOrTime,
  TaskWithDueDay,
  TaskWithDueTime,
} from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { sortRepeatableTaskCfgs } from '../task-repeat-cfg/sort-repeatable-task-cfg';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { combineLatest, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  selectTasksDueAndOverdueForDay,
  selectTasksDueForDay,
  selectTasksWithDueTimeForRange,
  selectTasksWithDueTimeUntil,
} from '../tasks/store/task.selectors';
import { getDateRangeForDay } from '../../util/get-date-range-for-day';
import { first, map, switchMap } from 'rxjs/operators';
import { updateTaskTags } from '../tasks/store/task.actions';
import { TODAY_TAG } from '../tag/tag.const';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { getWorklogStr } from '../../util/get-work-log-str';

@Injectable({
  providedIn: 'root',
})
export class AddTasksForTomorrowService {
  private _store = inject(Store);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);

  private _tomorrowDate$ = this._globalTrackingIntervalService.todayDateStr$.pipe(
    map((todayStr) => {
      const d = new Date(todayStr);
      d.setDate(d.getDate() + 1);
      return d;
    }),
  );
  private _todayDateTime$ = this._globalTrackingIntervalService.todayDateStr$.pipe(
    map((todayStr) => {
      return new Date(todayStr).getTime();
    }),
  );

  private _repeatableForToday$: Observable<TaskRepeatCfg[]> = this._todayDateTime$.pipe(
    switchMap((dt) =>
      this._taskRepeatCfgService.getRepeatTableTasksDueForDayIncludingOverdue$(dt),
    ),
  );
  private _repeatableForTomorrow$: Observable<TaskRepeatCfg[]> = this._tomorrowDate$.pipe(
    switchMap((d) =>
      this._taskRepeatCfgService.getRepeatTableTasksDueForDayOnly$(d.getTime()),
    ),
  );
  private _dueWithTimeForToday$: Observable<TaskWithDueTime[]> =
    this._todayDateTime$.pipe(
      switchMap((dt) =>
        this._store.select(selectTasksWithDueTimeUntil, getDateRangeForDay(dt).end),
      ),
    );
  private _dueWithTimeForTomorrow$: Observable<TaskWithDueTime[]> =
    this._tomorrowDate$.pipe(
      switchMap((dt) =>
        this._store.select(
          selectTasksWithDueTimeForRange,
          getDateRangeForDay(dt.getTime()),
        ),
      ),
    );

  private _dueForDayForToday$: Observable<TaskWithDueDay[]> =
    this._globalTrackingIntervalService.todayDateStr$.pipe(
      switchMap((ds) => this._store.select(selectTasksDueAndOverdueForDay, ds)),
    );
  private _dueForDayForTomorrow$: Observable<TaskWithDueDay[]> = this._tomorrowDate$.pipe(
    switchMap((d) => this._store.select(selectTasksDueForDay, getWorklogStr(d))),
  );

  allPlannedForTodayNotOnToday$: Observable<TaskPlannedWithDayOrTime[]> = combineLatest([
    this._dueWithTimeForToday$,
    this._dueForDayForToday$,
  ]).pipe(map(([dueWithTime, dueForDay]) => [...dueWithTime, ...dueForDay]));

  nrOfPlannerItemsForTomorrow$: Observable<number> = combineLatest([
    this._repeatableForTomorrow$,
    this._dueWithTimeForTomorrow$,
    this._dueForDayForTomorrow$,
  ]).pipe(map(([a, b, c]) => a.length + b.length + c.length));

  async addAllDueToday(): Promise<void> {
    const [dueWithTime, dueWithDay, repeatCfgs] = await combineLatest([
      this._dueWithTimeForToday$,
      this._dueForDayForToday$,
      this._repeatableForToday$,
    ])
      .pipe(first())
      .toPromise();

    await this._addAllDue(Date.now(), dueWithTime, dueWithDay, repeatCfgs);
  }

  async addAllDueTomorrow(): Promise<void> {
    const [dueWithTime, dueWithDay, repeatCfgs] = await combineLatest([
      this._dueWithTimeForTomorrow$,
      this._dueForDayForTomorrow$,
      this._repeatableForTomorrow$,
    ])
      .pipe(first())
      .toPromise();

    // eslint-disable-next-line no-mixed-operators
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    await this._addAllDue(tomorrow, dueWithTime, dueWithDay, repeatCfgs);
  }

  movePlannedTasksToToday(plannedTasks: TaskCopy[]): void {
    plannedTasks.reverse().forEach((task) => {
      if (!task.tagIds.includes(TODAY_TAG.id)) {
        this._store.dispatch(
          updateTaskTags({ task, newTagIds: [TODAY_TAG.id, ...task.tagIds] }),
        );
      }
    });
  }

  private async _addAllDue(
    dt: number,
    dueWithTime: TaskWithDueTime[],
    dueWithDay: TaskWithDueDay[],
    dueRepeatCfgs: TaskRepeatCfg[],
  ): Promise<void> {
    this.movePlannedTasksToToday(
      dueWithDay.sort((a, b) => a.dueDay.localeCompare(b.dueDay)),
    );

    console.log({
      dt,
      dueWithTime,
      dueWithDay,
      dueRepeatCfgs,
    });

    const promises = dueRepeatCfgs.sort(sortRepeatableTaskCfgs).map((repeatCfg) => {
      return this._taskRepeatCfgService.createRepeatableTask(repeatCfg, dt);
    });

    await Promise.all(promises);

    this.movePlannedTasksToToday(
      dueWithTime.sort((a, b) => a.dueWithTime - b.dueWithTime),
    );
  }
}
