import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ScheduleEvent } from '../schedule.model';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { formatDate } from '@angular/common';
import { T } from '../../../t.const';
import { ScheduleService } from '../schedule.service';
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';
import { DateTimeFormatService } from 'src/app/core/date-time-format/date-time-format.service';

@Component({
  selector: 'schedule-month',
  imports: [ScheduleEventComponent, LocaleDatePipe, LocaleDatePipe],
  templateUrl: './schedule-month.component.html',
  styleUrl: './schedule-month.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ScheduleMonthComponent {
  private _scheduleService = inject(ScheduleService);
  private _dateTimeFormatService = inject(DateTimeFormatService);

  readonly events = input<ScheduleEvent[] | null>([]);
  readonly daysToShow = input<string[]>([]);
  readonly weeksToShow = input<number>(6);
  readonly firstDayOfWeek = input<number>(1);

  // Generate weekday headers based on firstDayOfWeek setting
  readonly weekdayHeaders = computed(() => {
    const firstDay = this.firstDayOfWeek();
    const headers: string[] = [];

    // Create a date for each day of week (using a week starting on Sunday)
    // January 2, 2000 was a Sunday
    const sundayDate = new Date(2000, 0, 2);

    for (let i = 0; i < 7; i++) {
      const dayIndex = (firstDay + i) % 7;
      const date = new Date(sundayDate);
      date.setDate(sundayDate.getDate() + dayIndex);
      // 'EEE' format gives abbreviated day name (e.g., 'Mon', 'Tue')
      headers.push(formatDate(date, 'EEE', this._dateTimeFormatService.currentLocale));
    }

    return headers;
  });

  T: typeof T = T;

  getDayClass(day: string): string {
    return this._scheduleService.getDayClass(day);
  }

  getWeekIndex(dayIndex: number): number {
    return Math.floor(dayIndex / 7);
  }

  getDayIndex(dayIndex: number): number {
    return dayIndex % 7;
  }

  hasEventsForDay(day: string): boolean {
    return this._scheduleService.hasEventsForDay(day, this.events() || []);
  }

  getEventsForDay(day: string): ScheduleEvent[] {
    return this._scheduleService.getEventsForDay(day, this.events() || []);
  }

  getEventDayStr(ev: ScheduleEvent): string | null {
    return this._scheduleService.getEventDayStr(ev);
  }
}
