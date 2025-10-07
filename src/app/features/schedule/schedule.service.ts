import { inject, Injectable } from '@angular/core';
import { DateService } from '../../core/date/date.service';
import { ScheduleEvent } from './schedule.model';
import { SVEType } from './schedule.const';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private _dateService = inject(DateService);

  getDaysToShow(nrOfDaysToShow: number): string[] {
    const today = new Date().getTime();
    const daysToShow: string[] = [];
    for (let i = 0; i < nrOfDaysToShow; i++) {
      // eslint-disable-next-line no-mixed-operators
      daysToShow.push(this._dateService.todayStr(today + i * 24 * 60 * 60 * 1000));
    }
    return daysToShow;
  }

  getMonthDaysToShow(numberOfWeeks: number, firstDayOfWeek: number = 0): string[] {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate the first day to show based on firstDayOfWeek setting
    // firstDayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, etc.
    const firstDayToShow = new Date(firstDayOfMonth);
    const monthStartDay = firstDayOfMonth.getDay(); // 0=Sunday, 1=Monday, etc.

    // Calculate how many days to go back from the first of the month
    const daysToGoBack = (monthStartDay - firstDayOfWeek + 7) % 7;
    firstDayToShow.setDate(firstDayOfMonth.getDate() - daysToGoBack);

    const totalDays = numberOfWeeks * 7;
    const daysToShow: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(firstDayToShow);
      currentDate.setDate(firstDayToShow.getDate() + i);
      daysToShow.push(this._dateService.todayStr(currentDate.getTime()));
    }

    return daysToShow;
  }

  getEventDayStr(ev: ScheduleEvent): string | null {
    const data = ev.data;

    // Calendar events
    if (ev.type === SVEType.CalendarEvent && data && 'start' in data) {
      const start = (data as { start: unknown }).start;
      if (typeof start === 'number') {
        return this._dateService.todayStr(start);
      }
    }

    // Tasks planned for a day
    if (
      (ev.type === SVEType.TaskPlannedForDay ||
        ev.type === SVEType.SplitTaskPlannedForDay) &&
      data &&
      'plannedForDay' in data
    ) {
      const plannedForDay = (data as { plannedForDay: unknown }).plannedForDay;
      if (typeof plannedForDay === 'string') {
        return plannedForDay;
      }
    }

    // ScheduledTask may have plannedForDay or be scheduled for today
    if (ev.type === SVEType.ScheduledTask && data) {
      if ('plannedForDay' in data) {
        const plannedForDay = (data as { plannedForDay: unknown }).plannedForDay;
        if (typeof plannedForDay === 'string') {
          return plannedForDay;
        }
      }

      // For scheduled tasks with time, they may have reminderData or be planned for today
      if ('remindAt' in data) {
        const remindAt = (data as { remindAt: unknown }).remindAt;
        if (typeof remindAt === 'number') {
          return this._dateService.todayStr(remindAt);
        }
      }

      // Check dueWithTime for scheduled tasks
      if ('dueWithTime' in data) {
        const dueWithTime = (data as { dueWithTime: unknown }).dueWithTime;
        if (typeof dueWithTime === 'number') {
          return this._dateService.todayStr(dueWithTime);
        }
      }
    }

    // SplitTask may have plannedForDay
    if (ev.type === SVEType.SplitTask && data && 'plannedForDay' in data) {
      const plannedForDay = (data as { plannedForDay: unknown }).plannedForDay;
      if (typeof plannedForDay === 'string') {
        return plannedForDay;
      }
    }

    // Regular tasks may have plannedForDay or dueDay
    if (ev.type === SVEType.Task && data) {
      // Check plannedForDay first
      if ('plannedForDay' in data) {
        const plannedForDay = (data as { plannedForDay: unknown }).plannedForDay;
        if (typeof plannedForDay === 'string') {
          return plannedForDay;
        }
      }

      // Check dueDay if plannedForDay not found
      if ('dueDay' in data) {
        const dueDay = (data as { dueDay: unknown }).dueDay;
        if (typeof dueDay === 'string') {
          return dueDay;
        }
      }
    }

    // RepeatProjection types
    if (
      (ev.type === SVEType.RepeatProjection ||
        ev.type === SVEType.ScheduledRepeatProjection) &&
      data &&
      'plannedForDay' in data
    ) {
      const plannedForDay = (data as { plannedForDay: unknown }).plannedForDay;
      if (typeof plannedForDay === 'string') {
        return plannedForDay;
      }
    }

    // If no specific date found, return null
    return null;
  }

  getDayClass(day: string): string {
    const dayDate = new Date(day);
    const today = new Date();
    const isCurrentMonth =
      dayDate.getMonth() === today.getMonth() &&
      dayDate.getFullYear() === today.getFullYear();
    const isToday = dayDate.toDateString() === today.toDateString();

    let classes = '';
    if (!isCurrentMonth) classes += ' other-month';
    if (isToday) classes += ' today';

    return classes;
  }

  hasEventsForDay(day: string, events: ScheduleEvent[] | null): boolean {
    if (!events) {
      return false;
    }
    return events.some((ev) => {
      const eventDay = this.getEventDayStr(ev);
      return eventDay === day;
    });
  }

  getEventsForDay(day: string, events: ScheduleEvent[] | null): ScheduleEvent[] {
    if (!events) {
      return [];
    }
    return events.filter((ev) => {
      const eventDay = this.getEventDayStr(ev);
      return eventDay === day;
    });
  }
}
