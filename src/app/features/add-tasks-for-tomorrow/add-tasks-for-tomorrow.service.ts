import { inject, Injectable } from '@angular/core';
import { TaskCopy, TaskWithDueDay, TaskWithDueTime } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { sortRepeatableTaskCfgs } from '../task-repeat-cfg/sort-repeatable-task-cfg';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { combineLatest, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  selectTasksDueForDay,
  selectTasksWithDueTimeForRange,
} from '../tasks/store/task.selectors';
import { getDateRangeForDay } from '../../util/get-date-range-for-day';
import { first, map, switchMap } from 'rxjs/operators';
import { TODAY_TAG } from '../tag/tag.const';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { getWorklogStr } from '../../util/get-work-log-str';
import { planTasksForToday } from '../tag/store/tag.actions';
import { PlannerService } from '../planner/planner.service';

const filterDoneAndToday = (task: TaskCopy): boolean =>
  !task.isDone && !task.tagIds.includes(TODAY_TAG.id);

@Injectable({
  providedIn: 'root',
})
export class AddTasksForTomorrowService {
  private _store = inject(Store);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _plannerService = inject(PlannerService);

  private _tomorrowDate$ = this._globalTrackingIntervalService.todayDateStr$.pipe(
    map((todayStr) => {
      const d = new Date(todayStr);
      d.setDate(d.getDate() + 1);
      return d;
    }),
  );
  private _repeatableForTomorrow$: Observable<TaskRepeatCfg[]> = this._tomorrowDate$.pipe(
    switchMap((d) =>
      this._taskRepeatCfgService.getRepeatableTasksDueForDayOnly$(d.getTime()),
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
      map((tasks) => tasks.filter(filterDoneAndToday)),
    );

  private _dueForDayForTomorrow$: Observable<TaskWithDueDay[]> = this._tomorrowDate$.pipe(
    switchMap((d) => this._store.select(selectTasksDueForDay, getWorklogStr(d))),
    map((tasks) => tasks.filter(filterDoneAndToday)),
  );

  nrOfPlannerItemsForTomorrow$: Observable<number> = combineLatest([
    this._repeatableForTomorrow$,
    this._dueWithTimeForTomorrow$,
    this._dueForDayForTomorrow$,
  ]).pipe(map(([a, b, c]) => a.length + b.length + c.length));

  async addAllDueTomorrow(): Promise<'ADDED' | void> {
    const dueRepeatCfgs = await this._repeatableForTomorrow$.pipe(first()).toPromise();

    // eslint-disable-next-line no-mixed-operators
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

    const promises = dueRepeatCfgs.sort(sortRepeatableTaskCfgs).map((repeatCfg) => {
      return this._taskRepeatCfgService.createRepeatableTask(repeatCfg, tomorrow);
    });
    await Promise.all(promises);

    // NOTE we only get the tasks due after we created the repeatable tasks (which then should be also due tomorrow)
    const [dueWithTime, dueWithDay] = await combineLatest([
      this._dueWithTimeForTomorrow$,
      this._dueForDayForTomorrow$,
    ])
      .pipe(first())
      .toPromise();

    // we do this to keep the order of the tasks in planner
    const tomorrowFromPlanner = await this._plannerService.tomorrow$
      .pipe(first())
      .toPromise();
    const tomorrowTasksFromPlanner = tomorrowFromPlanner?.tasks || [];

    const allDue = tomorrowTasksFromPlanner.filter((t) => !t.dueWithTime);
    [...dueWithTime, ...dueWithDay].forEach((task) => {
      if (!allDue.find((t) => t.id === task.id)) {
        allDue.push(task);
      }
    });

    const allDueSorted = allDue.sort((a, b) => {
      // Handle cases where properties might be undefined
      const aDate = a.dueDay ? new Date(a.dueDay) : null;
      const bDate = b.dueDay ? new Date(b.dueDay) : null;

      // Get timestamp values, with fallbacks
      const aTime =
        a.dueWithTime || (aDate ? aDate.setHours(0, 0, 0, 0) : Number.MAX_SAFE_INTEGER);
      const bTime =
        b.dueWithTime || (bDate ? bDate.setHours(0, 0, 0, 0) : Number.MAX_SAFE_INTEGER);

      // For same day comparison
      const aDay = a.dueWithTime
        ? new Date(a.dueWithTime).setHours(0, 0, 0, 0)
        : aDate
          ? aDate.setHours(0, 0, 0, 0)
          : null;
      const bDay = b.dueWithTime
        ? new Date(b.dueWithTime).setHours(0, 0, 0, 0)
        : bDate
          ? bDate.setHours(0, 0, 0, 0)
          : null;

      // Special handling for same day
      if (aDay !== null && bDay !== null && aDay === bDay) {
        // If one has dueDay without time and other has dueWithTime
        if (a.dueDay && !a.dueWithTime && b.dueWithTime) return -1;
        if (b.dueDay && !b.dueWithTime && a.dueWithTime) return 1;
      }

      // Default chronological ordering
      return aTime - bTime;
    });

    this.movePlannedTasksToToday(allDueSorted);

    if (allDueSorted.length) {
      return 'ADDED';
    }
  }

  movePlannedTasksToToday(plannedTasks: TaskCopy[]): void {
    this._store.dispatch(planTasksForToday({ taskIds: plannedTasks.map((t) => t.id) }));
  }
}
