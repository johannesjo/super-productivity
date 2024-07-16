import { Injectable } from '@angular/core';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { TimelineCalendarMapEntry } from '../timeline/timeline.model';
import { selectCalendarProviders } from '../config/store/global-config.reducer';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import {
  selectAllCalendarTaskEventIds,
  selectPlannedTasksById,
} from '../tasks/store/task.selectors';
import { CalendarIntegrationEvent } from '../calendar-integration/calendar-integration.model';
import { loadFromRealLs, saveToRealLs } from '../../core/persistence/local-storage';
import { LS } from '../../core/persistence/storage-keys.const';
import { Store } from '@ngrx/store';
import { CalendarIntegrationService } from '../calendar-integration/calendar-integration.service';
import { PlannerDay } from './planner.model';
import { selectPlannerDays } from './store/planner.selectors';
import { ReminderService } from '../reminder/reminder.service';
import { TaskPlanned } from '../tasks/task.model';
import { selectAllTaskRepeatCfgs } from '../task-repeat-cfg/store/task-repeat-cfg.reducer';
import { DateService } from '../../core/date/date.service';
import { fastArrayCompare } from '../../util/fast-array-compare';

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  // includedWeekDays$ = of([0, 1, 2, 3, 4, 5, 6]);
  includedWeekDays$ = of([0, 1, 2, 3, 4, 5, 6]);

  daysToShow$ = this.includedWeekDays$.pipe(
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

  private icalEvents$: Observable<TimelineCalendarMapEntry[]> = this._store
    .select(selectCalendarProviders)
    .pipe(
      // tap(() => console.log('selectCalendarProviders')),
      distinctUntilChanged(fastArrayCompare),
      switchMap((calendarProviders) => {
        return calendarProviders && calendarProviders.length
          ? forkJoin(
              calendarProviders
                .filter((calProvider) => calProvider.isEnabled)
                .map((calProvider) =>
                  this._calendarIntegrationService
                    .requestEventsForTimeline(calProvider)
                    .pipe(
                      // tap((v) =>
                      //   console.log('calendarIntegrationService in forkjoin', v),
                      // ),
                      map((itemsForProvider: CalendarIntegrationEvent[]) => ({
                        itemsForProvider,
                        calProvider,
                      })),
                    ),
                ),
            ).pipe(
              switchMap((resultForProviders) =>
                this._store.select(selectAllCalendarTaskEventIds).pipe(
                  distinctUntilChanged(fastArrayCompare),
                  // tap((val) => console.log('selectAllCalendarTaskEventIds', val)),
                  map((allCalendarTaskEventIds) => {
                    return resultForProviders.map(({ itemsForProvider, calProvider }) => {
                      return {
                        ico: calProvider.icon || null,
                        //   // filter out items already added as tasks
                        items: itemsForProvider.filter(
                          (calEv) => !allCalendarTaskEventIds.includes(calEv.id),
                        ),
                      };
                    });
                  }),
                ),
              ),
              // tap((v) => console.log('icalEvents$ final', v)),
              tap((val) => {
                saveToRealLs(LS.TIMELINE_CACHE, val);
              }),
            )
          : of([] as any);
      }),
      startWith(this._getCalProviderFromCache()),
    );

  allPlannedTasks$: Observable<TaskPlanned[]> = this._reminderService.reminders$.pipe(
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

  // TODO this needs to be more performant
  days$: Observable<PlannerDay[]> = this.daysToShow$.pipe(
    switchMap((daysToShow) =>
      combineLatest([
        this._store.select(selectAllTaskRepeatCfgs),
        this.icalEvents$,
        this.allPlannedTasks$,
        // this._store
        //   .select(selectAllTaskRepeatCfgs)
        //   .pipe(
        //     tap((val) =>
        //       console.log('DI _store.select(selectAllTaskRepeatCfgs) for $days', val),
        //     ),
        //   ),
        // this.icalEvents$.pipe(tap((val) => console.log('DI icalEvents$ for $days', val))),
        // this.allPlannedTasks$.pipe(
        //   tap((val) => console.log('DI allPlannedTasks$ for $days', val)),
        // ),
      ]).pipe(
        switchMap(([taskRepeatCfgs, icalEvents, allTasksPlanned]) =>
          this._store.select(
            selectPlannerDays(daysToShow, taskRepeatCfgs, icalEvents, allTasksPlanned),
          ),
        ),
      ),
    ),
    // for better performance
    // TODO better solution, gets called very often
    tap((val) => console.log('days$', val)),
    // tap((val) => console.log('days$ SIs', val[0]?.scheduledIItems)),
    shareReplay(1),
  );

  constructor(
    private _store: Store,
    private _reminderService: ReminderService,
    private _calendarIntegrationService: CalendarIntegrationService,
    private _dateService: DateService,
  ) {}

  private _getCalProviderFromCache(): TimelineCalendarMapEntry[] {
    const now = Date.now();
    return (
      ((loadFromRealLs(LS.TIMELINE_CACHE) as TimelineCalendarMapEntry[]) || [])
        // filter out cached past entries
        .map((provider) => ({
          ...provider,
          items: provider.items.filter((item) => item.start + item.duration >= now),
        }))
    );
  }
}
