import { Injectable } from '@angular/core';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { TimelineCalendarMapEntry } from '../../timeline/timeline.model';
import { selectCalendarProviders } from '../../config/store/global-config.reducer';
import { distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import {
  selectAllCalendarTaskEventIds,
  selectTasksById,
} from '../../tasks/store/task.selectors';
import { distinctUntilChangedObject } from '../../../util/distinct-until-changed-object';
import { CalendarIntegrationEvent } from '../../calendar-integration/calendar-integration.model';
import { loadFromRealLs, saveToRealLs } from '../../../core/persistence/local-storage';
import { LS } from '../../../core/persistence/storage-keys.const';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { Store } from '@ngrx/store';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { WeekPlannerDay } from '../week-planner.model';
import { selectWeekPlannerDays } from '../store/week-planner.selectors';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { ReminderService } from '../../reminder/reminder.service';
import { TaskPlanned } from '../../tasks/task.model';

@Injectable({
  providedIn: 'root',
})
export class WeekPlannerPlanViewService {
  icalEvents$: Observable<TimelineCalendarMapEntry[]> = this._store
    .select(selectCalendarProviders)
    .pipe(
      switchMap((calendarProviders) =>
        this._store.select(selectAllCalendarTaskEventIds).pipe(
          map((allCalendarTaskEventIds) => ({
            allCalendarTaskEventIds,
            calendarProviders,
          })),
        ),
      ),
      distinctUntilChanged(distinctUntilChangedObject),
      switchMap(({ allCalendarTaskEventIds, calendarProviders }) => {
        return calendarProviders && calendarProviders.length
          ? forkJoin(
              calendarProviders
                .filter((calProvider) => calProvider.isEnabled)
                .map((calProvider) =>
                  this._calendarIntegrationService
                    .requestEventsForTimeline(calProvider)
                    .pipe(
                      // filter out items already added as tasks
                      map((calEvs) =>
                        calEvs.filter(
                          (calEv) => !allCalendarTaskEventIds.includes(calEv.id),
                        ),
                      ),
                      map((items: CalendarIntegrationEvent[]) => ({
                        items,
                        icon: calProvider.icon || null,
                      })),
                    ),
                ),
            ).pipe(
              tap((val) => {
                saveToRealLs(LS.TIMELINE_CACHE, val);
              }),
            )
          : of([] as any);
      }),
      startWith(this._getCalProviderFromCache()),
    );

  daysToShow$ = of([
    getWorklogStr(),
    // eslint-disable-next-line no-mixed-operators
    getWorklogStr(new Date().getTime() + 24 * 60 * 60 * 1000),
    // eslint-disable-next-line no-mixed-operators
    getWorklogStr(new Date().getTime() + 48 * 60 * 60 * 1000),
  ]);

  allPlannedTasks$: Observable<TaskPlanned[]> = this._reminderService.reminders$.pipe(
    switchMap((reminders) => {
      const tids = reminders
        .filter((reminder) => reminder.type === 'TASK')
        .map((reminder) => reminder.relatedId);
      return this._store.select(selectTasksById, { ids: tids }) as Observable<
        TaskPlanned[]
      >;
    }),
  );

  days$: Observable<WeekPlannerDay[]> = this.daysToShow$.pipe(
    switchMap((daysToShow) =>
      combineLatest([
        this._taskRepeatCfgService.taskRepeatCfgsWithStartTime$,
        this.icalEvents$,
        this.allPlannedTasks$,
      ]).pipe(
        switchMap(([taskRepeatCfgs, icalEvents, allTasksPlanned]) =>
          this._store.select(
            selectWeekPlannerDays(
              daysToShow,
              taskRepeatCfgs,
              icalEvents,
              allTasksPlanned,
            ),
          ),
        ),
      ),
    ),
  );

  constructor(
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _store: Store,
    private _reminderService: ReminderService,
    private _calendarIntegrationService: CalendarIntegrationService,
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
