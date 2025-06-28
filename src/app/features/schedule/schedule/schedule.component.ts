import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { combineLatest, fromEvent, Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { selectTimelineTasks } from '../../work-context/store/work-context.selectors';
import { selectPlannerDayMap } from '../../planner/store/planner.selectors';
import { debounceTime, map, startWith, switchMap } from 'rxjs/operators';
import { TaskService } from '../../tasks/task.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { DateService } from '../../../core/date/date.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../dialog-timeline-setup/dialog-timeline-setup.component';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ScheduleDay, ScheduleEvent } from '../schedule.model';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import {
  selectTimelineConfig,
  selectTimelineWorkStartEndHours,
} from '../../config/store/global-config.reducer';
import { FH } from '../schedule.const';
import { mapToScheduleDays } from '../map-schedule-data/map-to-schedule-days';
import { mapScheduleDaysToScheduleEvents } from '../map-schedule-data/map-schedule-days-to-schedule-events';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatFabButton } from '@angular/material/button';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { ScheduleWeekComponent } from '../schedule-week/schedule-week.component';
import { ScheduleMonthComponent } from '../schedule-month/schedule-month.component';
import { ScheduleService } from '../schedule.service';
import { ShortcutService } from '../../../core-ui/shortcut/shortcut.service';

@Component({
  selector: 'schedule',
  imports: [
    AsyncPipe,
    DatePipe,
    ScheduleWeekComponent,
    ScheduleMonthComponent,
    MatIcon,
    MatFabButton,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ScheduleComponent {
  taskService = inject(TaskService);
  layoutService = inject(LayoutService);
  scheduleService = inject(ScheduleService);
  shortcutService = inject(ShortcutService);
  private _matDialog = inject(MatDialog);
  private _calendarIntegrationService = inject(CalendarIntegrationService);
  private _store = inject(Store);
  private _dateService = inject(DateService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);

  isMonthView$ = this.layoutService.selectedTimeView$.pipe(
    map((view) => view === 'month'),
  );

  daysToShow$ = combineLatest([
    this._globalTrackingIntervalService.todayDateStr$,
    this.layoutService.selectedTimeView$,
  ]).pipe(
    switchMap(([, selectedView]) => {
      return fromEvent(window, 'resize').pipe(
        startWith(window.innerWidth),
        debounceTime(50),
        map(() => {
          const width = window.innerWidth;
          const height = window.innerHeight;

          if (selectedView === 'month') {
            const availableHeight = height - 160;
            const minHeightPerWeek = width < 768 ? 60 : 100;
            const maxWeeks = Math.floor(availableHeight / minHeightPerWeek);

            if (maxWeeks < 3) {
              return 3;
            } else if (maxWeeks > 6) {
              return 6;
            } else {
              return maxWeeks;
            }
          }

          if (width < 600) {
            return 3;
          } else if (width < 900) {
            return 4;
          } else if (width < 1900) {
            return 5;
          } else if (width < 2200) {
            return 7;
          } else {
            return 10;
          }
        }),
        map((number) => {
          if (selectedView === 'month') {
            return this.scheduleService.getMonthDaysToShow(number);
          }
          return this.scheduleService.getDaysToShow(number);
        }),
      );
    }),
  );
  daysToShow: string[] = [];
  weeksToShow: number = 6;

  scheduleDays$: Observable<ScheduleDay[]> = combineLatest([
    this._store.pipe(select(selectTimelineTasks)),
    this._store.pipe(select(selectTaskRepeatCfgsWithAndWithoutStartTime)),
    this._store.pipe(select(selectTimelineConfig)),
    this._calendarIntegrationService.icalEvents$,
    this._store.pipe(select(selectPlannerDayMap)),
    // because typing messes up if there are more than 6
    combineLatest([this.taskService.currentTaskId$, this.daysToShow$]),
  ]).pipe(
    debounceTime(50),
    map(
      ([
        { planned, unPlanned },
        { withStartTime, withoutStartTime },
        timelineCfg,
        icalEvents,
        plannerDayMap,
        [currentId, daysToShow],
      ]) =>
        mapToScheduleDays(
          Date.now(),
          daysToShow,
          unPlanned,
          planned,
          withStartTime,
          withoutStartTime,
          icalEvents,
          currentId,
          plannerDayMap,
          timelineCfg?.isWorkStartEndEnabled
            ? {
                startTime: timelineCfg.workStart,
                endTime: timelineCfg.workEnd,
              }
            : undefined,
          timelineCfg?.isLunchBreakEnabled
            ? {
                startTime: timelineCfg.lunchBreakStart,
                endTime: timelineCfg.lunchBreakEnd,
              }
            : undefined,
        ),
    ),
  );

  eventsAndBeyondBudget$: Observable<{
    eventsFlat: ScheduleEvent[];
    beyondBudgetDays: ScheduleEvent[][];
  }> = this.scheduleDays$.pipe(map((days) => mapScheduleDaysToScheduleEvents(days, FH)));

  workStartEnd$ = this._store.pipe(select(selectTimelineWorkStartEndHours)).pipe(
    map((v) => {
      return (
        v && {
          // NOTE: +1 because grids start at 1
          workStartRow: Math.round(FH * v.workStart) + 1,
          workEndRow: Math.round(FH * v.workEnd) + 1,
        }
      );
    }),
  );

  events$: Observable<ScheduleEvent[]> = this.eventsAndBeyondBudget$.pipe(
    map(({ eventsFlat }) => eventsFlat),
  );
  beyondBudget$: Observable<ScheduleEvent[][]> = this.eventsAndBeyondBudget$.pipe(
    map(({ beyondBudgetDays }) => beyondBudgetDays),
  );

  currentTimeRow$ = this.scheduleDays$.pipe(
    map((days) => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      // eslint-disable-next-line no-mixed-operators
      const hoursToday = hours + minutes / 60;
      const row = Math.round(hoursToday * FH);
      return row;
    }),
  );

  constructor() {
    this.layoutService.setTimeView('week');

    if (!localStorage.getItem(LS.WAS_SCHEDULE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }

    this.daysToShow$.pipe(takeUntilDestroyed()).subscribe((days) => {
      this.daysToShow = days;
      this.weeksToShow = Math.ceil(days.length / 7);
    });
  }
}
