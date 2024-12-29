import { Injectable, inject } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  first,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { selectPlannedTasksById } from '../tasks/store/task.selectors';
import { Store } from '@ngrx/store';
import { CalendarIntegrationService } from '../calendar-integration/calendar-integration.service';
import { PlannerDay } from './planner.model';
import {
  selectAllDuePlannedDay,
  selectAllDuePlannedOnDay,
  selectPlannerDays,
  selectTaskIdPlannedDayMap,
} from './store/planner.selectors';
import { ReminderService } from '../reminder/reminder.service';
import { TaskPlanned } from '../tasks/task.model';
import { selectAllTaskRepeatCfgs } from '../task-repeat-cfg/store/task-repeat-cfg.reducer';
import { DateService } from '../../core/date/date.service';
import { fastArrayCompare } from '../../util/fast-array-compare';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { selectTodayTaskIds } from '../work-context/store/work-context.selectors';
import { getWorklogStr } from '../../util/get-work-log-str';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { msToString } from '../../ui/duration/ms-to-string.pipe';

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  private _store = inject(Store);
  private _reminderService = inject(ReminderService);
  private _calendarIntegrationService = inject(CalendarIntegrationService);
  private _dateService = inject(DateService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);

  includedWeekDays$ = of([0, 1, 2, 3, 4, 5, 6]);

  daysToShow$ = this._globalTrackingIntervalService.todayDateStr$.pipe(
    tap((val) => console.log('daysToShow$', val)),
    switchMap(() => this.includedWeekDays$),
    map((includedWeekDays) => {
      const today = new Date().getTime();
      const todayDayNr = new Date(today).getDay();
      const nrOfDaysToShow = 15;
      const daysToShow: string[] = [];
      for (let i = 0; i < nrOfDaysToShow; i++) {
        if (includedWeekDays.includes((i + todayDayNr) % 7)) {
          // eslint-disable-next-line no-mixed-operators
          daysToShow.push(this._dateService.todayStr(today + i * 24 * 60 * 60 * 1000));
        }
      }
      return daysToShow;
    }),
  );

  allScheduledTasks$: Observable<TaskPlanned[]> = this._reminderService.reminders$.pipe(
    switchMap((reminders) => {
      const tids = reminders
        .filter((reminder) => reminder.type === 'TASK')
        .map((reminder) => reminder.relatedId);
      return this._store.select(selectPlannedTasksById, { ids: tids }) as Observable<
        TaskPlanned[]
      >;
    }),
    distinctUntilChanged(fastArrayCompare),
  );

  plannerDayForAllDueToday$: Observable<PlannerDay> = combineLatest([
    this._store.select(selectAllTaskRepeatCfgs),
    this._calendarIntegrationService.icalEvents$,
    this.allScheduledTasks$,
    this._globalTrackingIntervalService.todayDateStr$,
  ]).pipe(
    switchMap(([taskRepeatCfgs, icalEvents, allTasksPlanned, todayStr]) =>
      this._store.select(
        selectAllDuePlannedDay(taskRepeatCfgs, icalEvents, allTasksPlanned, todayStr),
      ),
    ),
  );

  plannerDayForAllDueTomorrow$: Observable<PlannerDay> = combineLatest([
    this._store.select(selectAllTaskRepeatCfgs),
    this._calendarIntegrationService.icalEvents$,
    this.allScheduledTasks$,
    this._globalTrackingIntervalService.todayDateStr$,
  ]).pipe(
    switchMap(([taskRepeatCfgs, icalEvents, allTasksPlanned, todayStr]) => {
      const tomorrow = dateStrToUtcDate(todayStr);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getWorklogStr(tomorrow);
      return this._store.select(
        selectAllDuePlannedOnDay(
          taskRepeatCfgs,
          icalEvents,
          allTasksPlanned,
          tomorrowStr,
          todayStr,
        ),
      );
    }),
  );

  // TODO this needs to be more performant
  days$: Observable<PlannerDay[]> = this.daysToShow$.pipe(
    switchMap((daysToShow) =>
      combineLatest([
        this._store.select(selectAllTaskRepeatCfgs),
        this._store.select(selectTodayTaskIds),
        this._calendarIntegrationService.icalEvents$,
        this.allScheduledTasks$,
        this._globalTrackingIntervalService.todayDateStr$,
      ]).pipe(
        switchMap(
          ([taskRepeatCfgs, todayListTaskIds, icalEvents, allTasksPlanned, todayStr]) =>
            this._store.select(
              selectPlannerDays(
                daysToShow,
                taskRepeatCfgs,
                todayListTaskIds,
                icalEvents,
                allTasksPlanned,
                todayStr,
              ),
            ),
        ),
      ),
    ),
    // for better performance
    // TODO better solution, gets called very often
    // tap((val) => console.log('days$', val)),
    // tap((val) => console.log('days$ SIs', val[0]?.scheduledIItems)),
    shareReplay(1),
  );

  plannedTaskDayMap$: Observable<{ [taskId: string]: string }> = this._store
    .select(selectTaskIdPlannedDayMap)
    // make this more performant by sharing stream
    .pipe(shareReplay(1));

  getDayOnce$(dayStr: string): Observable<PlannerDay | undefined> {
    return this.days$.pipe(
      map((days) => days.find((d) => d.dayDate === dayStr)),
      first(),
    );
  }

  getSnackExtraStr(dayStr: string): Promise<string> {
    return this.getDayOnce$(dayStr)
      .pipe(
        map((day) => {
          if (!day) {
            return '';
          }
          if (day.timeEstimate === 0) {
            return ` – ∑ ${day.itemsTotal}`;
          }

          return `<br />∑ ${day.itemsTotal} ｜ ${msToString(day.timeEstimate)}`;
        }),
      )
      .toPromise();
  }
}
