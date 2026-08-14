import {
  isAllDayCalendarEvent,
  ScheduleCalendarMapEntry,
  ScheduleFromCalendarEvent,
} from '../schedule/schedule.model';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';

/**
 * Timed calendar events starting between `now` and the end of `todayStr`
 * (honoring the start-of-next-day offset), sorted by start time.
 *
 * All-day events are excluded — "Later Today" is about upcoming timed
 * commitments, mirroring selectLaterTodayTasksWithSubTasks' `dueWithTime >= now`
 * rule for tasks so events and tasks share the same visibility window.
 */
export const getLaterTodayCalendarEvents = (
  calendarEventEntries: ScheduleCalendarMapEntry[],
  todayStr: string,
  startOfNextDayDiffMs: number,
  now: number,
): ScheduleFromCalendarEvent[] => {
  if (!todayStr) {
    return [];
  }

  const todayDate = dateStrToUtcDate(todayStr);
  todayDate.setHours(23, 59, 59, 999);
  const todayEndTime = todayDate.getTime() + startOfNextDayDiffMs;

  const events: ScheduleFromCalendarEvent[] = [];
  for (const entry of calendarEventEntries) {
    for (const calEv of entry.items) {
      if (
        !isAllDayCalendarEvent(calEv) &&
        calEv.start >= now &&
        calEv.start <= todayEndTime
      ) {
        events.push(calEv);
      }
    }
  }

  return events.sort((a, b) => a.start - b.start);
};
