import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { ScheduleEvent } from '../schedule.model';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { safeFormatDate } from 'src/app/util/safe-format-date';
import { ScheduleService } from '../schedule.service';
import { DateTimeFormatService } from 'src/app/core/date-time-format/date-time-format.service';
import { parseDbDateStr } from 'src/app/util/parse-db-date-str';
import { TranslatePipe, TranslateService, TranslateStore } from '@ngx-translate/core';
import { getPluralKey } from '../../../util/get-plural-key';

const MONTH_EVENT_HEIGHT_PX = 22;

interface MonthLayoutMetrics {
  maxEvents: number;
  minGridHeight: number;
  viewportOffset: number;
  weekdayHeaderHeight: number;
  dayHeaderHeight: number;
  eventAreaBottomPadding: number;
  eventGap: number;
}

const getMonthLayoutMetrics = (
  viewportWidth: number,
  weeksToShow: number,
): MonthLayoutMetrics => {
  const maxEvents =
    weeksToShow === 3 ? 8 : weeksToShow === 4 ? 6 : weeksToShow === 5 ? 5 : 4;

  if (viewportWidth <= 599) {
    return {
      maxEvents,
      minGridHeight: 320,
      viewportOffset: 148,
      weekdayHeaderHeight: 28,
      dayHeaderHeight: 24,
      eventAreaBottomPadding: 1,
      eventGap: 1,
    };
  }

  if (viewportWidth <= 959) {
    return {
      maxEvents,
      minGridHeight: 400,
      viewportOffset: 128,
      weekdayHeaderHeight: 32,
      dayHeaderHeight: 28,
      eventAreaBottomPadding: 2,
      eventGap: 2,
    };
  }

  return {
    maxEvents,
    minGridHeight: 460,
    viewportOffset: 118,
    weekdayHeaderHeight: 38,
    dayHeaderHeight: 34,
    eventAreaBottomPadding: 4,
    eventGap: 3,
  };
};

export const calculateMonthEventLimit = (
  viewportWidth: number,
  viewportHeight: number,
  weeksToShow: number,
): number => {
  const metrics = getMonthLayoutMetrics(viewportWidth, weeksToShow);
  const gridHeight = Math.max(
    metrics.minGridHeight,
    viewportHeight - metrics.viewportOffset,
  );
  const dayCellHeight = (gridHeight - metrics.weekdayHeaderHeight) / weeksToShow;
  const eventAreaHeight =
    dayCellHeight - metrics.dayHeaderHeight - metrics.eventAreaBottomPadding;
  const eventsThatFit = Math.floor(
    (eventAreaHeight + metrics.eventGap) / (MONTH_EVENT_HEIGHT_PX + metrics.eventGap),
  );

  return Math.max(1, Math.min(metrics.maxEvents, eventsThatFit));
};

@Component({
  selector: 'schedule-month',
  imports: [ScheduleEventComponent, TranslatePipe],
  templateUrl: './schedule-month.component.html',
  styleUrl: './schedule-month.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ScheduleMonthComponent {
  private _scheduleService = inject(ScheduleService);
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _translateService = inject(TranslateService);
  private _translateStore = inject(TranslateStore);

  readonly events = input<ScheduleEvent[] | null>([]);
  readonly daysToShow = input<string[]>([]);
  readonly weeksToShow = input<number>(6);
  readonly firstDayOfWeek = input<number>(1);
  private readonly _viewportSize = signal(this.getViewportSize());

  @HostListener('window:resize')
  onWindowResize(): void {
    this._viewportSize.set(this.getViewportSize());
  }

  // Generate weekday headers based on firstDayOfWeek setting
  readonly weekdayHeaders = computed(() => {
    const firstDay = this.firstDayOfWeek();
    const headers: string[] = [];
    const isoTextLocale = this._dateTimeFormatService.isoTextLocale();
    const formatter = isoTextLocale
      ? new Intl.DateTimeFormat(isoTextLocale, { weekday: 'short' })
      : null;
    const locale = this._dateTimeFormatService.currentLocale();

    // Create a date for each day of week (using a week starting on Sunday)
    // January 2, 2000 was a Sunday
    const sundayDate = new Date(2000, 0, 2);

    for (let i = 0; i < 7; i++) {
      const dayIndex = (firstDay + i) % 7;
      const date = new Date(sundayDate);
      date.setDate(sundayDate.getDate() + dayIndex);
      headers.push(
        formatter ? formatter.format(date) : safeFormatDate(date, 'EEE', locale),
      );
    }

    return headers;
  });

  // Precompute the day-of-month label for every visible day, keyed on the day
  // list + current locale. Replaces a per-cell `| localeDate: 'd'` pipe (up to
  // 42 cells) so no date formatting happens during change detection; the map
  // only recomputes when the days or the locale change.
  readonly dayNumberByDay = computed<Record<string, string>>(() => {
    const locale = this._dateTimeFormatService.currentLocale();
    const map: Record<string, string> = {};
    for (const day of this.daysToShow()) {
      map[day] = safeFormatDate(day, 'd', locale);
    }
    return map;
  });

  // Determine the reference month from the displayed days
  // Find the first day that's actually in the target month (not padding days)
  readonly referenceMonth = computed(() => {
    const days = this.daysToShow();
    if (days.length === 0) return new Date();

    // Use the middle day as reference (around day 14-15 of the month)
    // This ensures we get a day that's actually in the target month
    const middleIndex = Math.floor(days.length / 2);
    return parseDbDateStr(days[middleIndex]);
  });

  getDayClass(day: string): string {
    return this._scheduleService.getDayClass(day, this.referenceMonth());
  }

  getWeekIndex(dayIndex: number): number {
    return Math.floor(dayIndex / 7);
  }

  getDayIndex(dayIndex: number): number {
    return dayIndex % 7;
  }

  getEventsForDay(day: string): ScheduleEvent[] {
    return this._scheduleService.getEventsForDay(day, this.events() || []);
  }

  getVisibleEvents(events: ScheduleEvent[]): ScheduleEvent[] {
    return events.slice(0, this.getVisibleEventLimit());
  }

  getHiddenEventCount(events: ScheduleEvent[]): number {
    return Math.max(0, events.length - this.getVisibleEventLimit());
  }

  private getVisibleEventLimit(): number {
    const viewport = this._viewportSize();
    return calculateMonthEventLimit(viewport.width, viewport.height, this.weeksToShow());
  }

  private getViewportSize(): { width: number; height: number } {
    return typeof window === 'undefined'
      ? { width: 1280, height: 800 }
      : { width: window.innerWidth, height: window.innerHeight };
  }

  getMoreEventsKey(count: number): string {
    return getPluralKey(
      this._translateService,
      this._translateStore,
      count,
      'F.SCHEDULE.MORE_EVENTS',
    );
  }

  getEventDayStr(ev: ScheduleEvent): string | null {
    return this._scheduleService.getEventDayStr(ev);
  }
}
