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
  selectTasksPlannedForDay,
  selectTasksWithDueTimeForRangeNotOnToday,
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

  // TODO check if this includes tasks that already have been created (probably does due to lastCreationDate)
  private _repeatableForTomorrow$: Observable<TaskRepeatCfg[]> = this._tomorrowDate$.pipe(
    switchMap((d) =>
      this._taskRepeatCfgService.getRepeatTableTasksDueForDayOnly$(d.getTime()),
    ),
  );
  private _dueWithTimeForToday$: Observable<TaskWithDueTime[]> =
    this._todayDateTime$.pipe(
      switchMap((dt) =>
        this._store.select(
          selectTasksWithDueTimeForRangeNotOnToday,
          getDateRangeForDay(dt),
        ),
      ),
    );
  private _dueWithTimeForTomorrow$: Observable<TaskWithDueTime[]> =
    this._tomorrowDate$.pipe(
      switchMap((dt) =>
        this._store.select(
          selectTasksWithDueTimeForRangeNotOnToday,
          getDateRangeForDay(dt.getTime()),
        ),
      ),
    );

  private _dueForDayForToday$: Observable<TaskWithDueDay[]> =
    this._globalTrackingIntervalService.todayDateStr$.pipe(
      switchMap((ds) => this._store.select(selectTasksPlannedForDay, ds)),
    );
  private _dueForDayForTomorrow$: Observable<TaskWithDueDay[]> = this._tomorrowDate$.pipe(
    switchMap((d) => this._store.select(selectTasksPlannedForDay, getWorklogStr(d))),
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

  async addAllPlannedTomorrowAndCreateRepeatable(): Promise<void> {
    // eslint-disable-next-line no-mixed-operators
    const dueWithTime = (
      await this._dueWithTimeForTomorrow$.pipe(first()).toPromise()
    ).sort((a, b) => a.dueWithTime - b.dueWithTime);
    const dueWithDay = await this._dueForDayForTomorrow$.pipe(first()).toPromise();
    const repeatCfgs = await this._repeatableForTomorrow$.pipe(first()).toPromise();

    this.movePlannedTasksToToday([...dueWithDay, ...dueWithTime]);

    // eslint-disable-next-line no-mixed-operators
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    const promises = repeatCfgs.sort(sortRepeatableTaskCfgs).map((repeatCfg) => {
      return this._taskRepeatCfgService.createRepeatableTask(repeatCfg, tomorrow);
    });

    await Promise.all(promises);
  }

  movePlannedTasksToToday(plannedTasks: TaskCopy[]): void {
    plannedTasks.reverse().forEach((task) => {
      this._store.dispatch(
        updateTaskTags({ task, newTagIds: [TODAY_TAG.id, ...task.tagIds] }),
      );
    });
  }
}
