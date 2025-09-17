/* eslint-disable */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { selectTimelineTasks } from '../../work-context/store/work-context.selectors';
import { selectPlannerDayMap } from '../../planner/store/planner.selectors';
import { debounceTime, map, startWith } from 'rxjs/operators';
import { TaskService } from '../../tasks/task.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../dialog-timeline-setup/dialog-timeline-setup.component';
import { LocaleDatePipe } from '../../../ui/pipes/locale-date.pipe';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { selectTimelineConfig } from '../../config/store/global-config.reducer';
import { FH } from '../schedule.const';
import { getHoursFromClockString } from '../../../util/get-hours-from-clock-string';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { mapToScheduleDays } from '../map-schedule-data/map-to-schedule-days';
import { mapScheduleDaysToScheduleEvents } from '../map-schedule-data/map-schedule-days-to-schedule-events';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { ScheduleWeekComponent } from '../schedule-week/schedule-week.component';
import { ScheduleMonthComponent } from '../schedule-month/schedule-month.component';
import { ScheduleService } from '../schedule.service';

@Component({
  selector: 'schedule',
  imports: [LocaleDatePipe, ScheduleWeekComponent, ScheduleMonthComponent, MatIcon],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,

  host: {
    '[style.--nr-of-days]': 'daysToShow().length',
  },
})
export class ScheduleComponent implements AfterViewInit {
  taskService = inject(TaskService);
  layoutService = inject(LayoutService);
  scheduleService = inject(ScheduleService);
  private _matDialog = inject(MatDialog);
  private _calendarIntegrationService = inject(CalendarIntegrationService);
  private _store = inject(Store);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _route = inject(ActivatedRoute);

  private _currentTimeViewMode = computed(() => this.layoutService.selectedTimeView());
  isMonthView = computed(() => this._currentTimeViewMode() === 'month');

  private _todayDateStr = toSignal(this._globalTrackingIntervalService.todayDateStr$);
  private _windowSize = toSignal(
    fromEvent(window, 'resize').pipe(
      startWith({ width: window.innerWidth, height: window.innerHeight }),
      debounceTime(50),
      map(() => ({ width: window.innerWidth, height: window.innerHeight })),
    ),
    { initialValue: { width: window.innerWidth, height: window.innerHeight } },
  );

  private _daysToShowCount = computed(() => {
    const size = this._windowSize();
    const selectedView = this._currentTimeViewMode();
    const width = size.width;
    const height = size.height;

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
  });

  daysToShow = computed(() => {
    const count = this._daysToShowCount();
    const selectedView = this._currentTimeViewMode();
    // Trigger re-computation when today changes
    this._todayDateStr();

    if (selectedView === 'month') {
      return this.scheduleService.getMonthDaysToShow(count);
    }
    return this.scheduleService.getDaysToShow(count);
  });

  weeksToShow = computed(() => Math.ceil(this.daysToShow().length / 7));

  private _timelineTasks = toSignal(this._store.pipe(select(selectTimelineTasks)));
  private _taskRepeatCfgs = toSignal(
    this._store.pipe(select(selectTaskRepeatCfgsWithAndWithoutStartTime)),
  );
  private _timelineConfig = toSignal(this._store.pipe(select(selectTimelineConfig)));
  private _icalEvents = toSignal(this._calendarIntegrationService.icalEvents$, {
    initialValue: [],
  });
  private _plannerDayMap = toSignal(this._store.pipe(select(selectPlannerDayMap)));
  private _currentTaskId = toSignal(this.taskService.currentTaskId$);

  scheduleDays = computed(() => {
    const timelineTasks = this._timelineTasks();
    const taskRepeatCfgs = this._taskRepeatCfgs();
    const timelineCfg = this._timelineConfig();
    const icalEvents = this._icalEvents();
    const plannerDayMap = this._plannerDayMap();
    const currentId = this._currentTaskId();
    const daysToShow = this.daysToShow();

    if (!timelineTasks || !taskRepeatCfgs || !plannerDayMap) {
      return [];
    }

    return mapToScheduleDays(
      Date.now(),
      daysToShow,
      timelineTasks.unPlanned,
      timelineTasks.planned,
      taskRepeatCfgs.withStartTime,
      taskRepeatCfgs.withoutStartTime,
      icalEvents,
      currentId || null,
      plannerDayMap,
      timelineCfg?.isWorkStartEndEnabled
        ? {
            startTime: timelineCfg.workStart,
            endTime: timelineCfg.workEnd,
          }
        : undefined,
      timelineCfg?.isWeekendHoursEnabled &&
        timelineCfg?.weekendWorkStart &&
        timelineCfg?.weekendWorkEnd
        ? {
            startTime: timelineCfg.weekendWorkStart,
            endTime: timelineCfg.weekendWorkEnd,
          }
        : undefined,
      timelineCfg?.isLunchBreakEnabled
        ? {
            startTime: timelineCfg.lunchBreakStart,
            endTime: timelineCfg.lunchBreakEnd,
          }
        : undefined,
      [
        ...(timelineCfg?.customBlockAStart && timelineCfg?.customBlockAEnd
          ? [
              {
                startTime: timelineCfg.customBlockAStart,
                endTime: timelineCfg.customBlockAEnd,
              },
            ]
          : []),
        ...(timelineCfg?.customBlockBStart && timelineCfg?.customBlockBEnd
          ? [
              {
                startTime: timelineCfg.customBlockBStart,
                endTime: timelineCfg.customBlockBEnd,
              },
            ]
          : []),
        // Parse multiple weekday custom blocks
        ...((timelineCfg?.customBlocksWeekdayStr || '')
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.includes('-'))
          .map((s) => {
            const [a, b] = s.split('-').map((v) => v.trim());
            return a && b ? ({ startTime: a, endTime: b } as const) : null;
          })
          .filter((v) => !!v) as { startTime: string; endTime: string }[]),
      ],
      // Weekend custom blocks parsed separately and applied by day
      (timelineCfg?.customBlocksWeekendStr || '')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.includes('-'))
        .map((s) => {
          const [a, b] = s.split('-').map((v) => v.trim());
          return a && b ? ({ startTime: a, endTime: b } as const) : null;
        })
        .filter((v) => !!v) as { startTime: string; endTime: string }[],
      timelineCfg?.isAutoSortByEstimateDesc,
    );
  });

  private _eventsAndBeyondBudget = computed(() => {
    const days = this.scheduleDays();
    return mapScheduleDaysToScheduleEvents(days, FH);
  });

  workStartEnd = computed(() => {
    // derive from config and today's weekday
    const cfg = this._timelineConfig();
    if (!cfg?.isWorkStartEndEnabled) {
      return null;
    }
    const day = new Date();
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const startStr =
      isWeekend && cfg.isWeekendHoursEnabled && cfg.weekendWorkStart
        ? cfg.weekendWorkStart
        : cfg.workStart;
    const endStr =
      isWeekend && cfg.isWeekendHoursEnabled && cfg.weekendWorkEnd
        ? cfg.weekendWorkEnd
        : cfg.workEnd;
    const workStart = getHoursFromClockString(startStr);
    const workEnd = getHoursFromClockString(endStr);
    return {
      workStartRow: Math.round(FH * workStart) + 1,
      workEndRow: Math.round(FH * workEnd) + 1,
    };
  });

  // Per-day work start/end rows for rendering dashed lines correctly per column
  workStartEndPerDay = computed(() => {
    const cfg = this._timelineConfig();
    const days = this.daysToShow();
    if (!cfg?.isWorkStartEndEnabled || !days?.length) {
      return null;
    }
    return days.map((dayStr) => {
      const d = dateStrToUtcDate(dayStr);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const startStr =
        isWeekend && cfg.isWeekendHoursEnabled && cfg.weekendWorkStart
          ? cfg.weekendWorkStart
          : cfg.workStart;
      const endStr =
        isWeekend && cfg.isWeekendHoursEnabled && cfg.weekendWorkEnd
          ? cfg.weekendWorkEnd
          : cfg.workEnd;
      const workStart = getHoursFromClockString(startStr);
      const workEnd = getHoursFromClockString(endStr);
      return {
        workStartRow: Math.round(FH * workStart) + 1,
        workEndRow: Math.round(FH * workEnd) + 1,
      };
    });
  });

  events = computed(() => this._eventsAndBeyondBudget().eventsFlat);
  beyondBudget = computed(() => this._eventsAndBeyondBudget().beyondBudgetDays);

  currentTimeRow = computed(() => {
    // Trigger re-computation
    this.scheduleDays();
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // eslint-disable-next-line no-mixed-operators
    const hoursToday = hours + minutes / 60;
    return Math.round(hoursToday * FH);
  });

  constructor() {
    this.layoutService.selectedTimeView.set('week');

    if (!localStorage.getItem(LS.WAS_SCHEDULE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }
  }

  ngAfterViewInit(): void {
    // Handle fragment scrolling manually as a fallback
    setTimeout(() => {
      const element = document.getElementById('work-start');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }); // Small delay to ensure DOM is fully rendered
  }
}
