import { ScheduleDay, ScheduleEvent } from '../schedule.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { getDurationForViewEntry } from './insert-blocked-blocks-view-entries-for-schedule';
import { ScheduleViewEntryType } from '../schedule.const';

export const mapScheduleDaysToScheduleEvents = (
  days: ScheduleDay[],
  FH: number,
): {
  eventsFlat: ScheduleEvent[];
  beyondBudgetDays: ScheduleEvent[][];
} => {
  const eventsFlat: ScheduleEvent[] = [];
  const beyondBudgetDays: ScheduleEvent[][] = [];

  days.forEach((day, dayIndex) => {
    beyondBudgetDays[dayIndex] = day.beyondBudgetTasks.map((taskPlannedForDay) => {
      // eslint-disable-next-line no-mixed-operators
      const timeLeft = getTimeLeftForTask(taskPlannedForDay);
      const timeLeftInHours = timeLeft / 1000 / 60 / 60;
      const rowSpan = Math.max(Math.round(timeLeftInHours * FH), 1);
      return {
        id: taskPlannedForDay.id,
        data: taskPlannedForDay,
        title: taskPlannedForDay.title,
        type: ScheduleViewEntryType.TaskPlannedForDay,
        style: `height: ${rowSpan * 8}px`,
        timeLeftInHours,
        startHours: 0,
      };
    });

    day.entries.forEach((entry, entryIndex) => {
      if (
        entry.type !== ScheduleViewEntryType.WorkdayEnd &&
        entry.type !== ScheduleViewEntryType.WorkdayStart
      ) {
        const entryAfter = day.entries[entryIndex + 1];
        const start = new Date(entry.start);
        const startHour = start.getHours();
        const startMinute = start.getMinutes();
        // eslint-disable-next-line no-mixed-operators
        const hoursToday = startHour + startMinute / 60;

        // NOTE: +1 cause grids start on 1
        const startRow = Math.round(hoursToday * FH) + 1;
        const timeLeft =
          entryAfter && entryAfter.type !== ScheduleViewEntryType.WorkdayEnd
            ? entryAfter.start - entry.start
            : getDurationForViewEntry(entry);

        const timeLeftInHours = timeLeft / 1000 / 60 / 60;

        const rowSpan = Math.max(1, Math.round(timeLeftInHours * FH));
        eventsFlat.push({
          title:
            (entry as any)?.data?.title ||
            (entry.type === ScheduleViewEntryType.LunchBreak ? 'Lunch Break' : 'TITLE'),
          id: (entry.data as any)?.id || entry.id,
          type: entry.type as ScheduleViewEntryType,
          startHours: hoursToday,
          timeLeftInHours,
          // title: entry.data.title,
          style: `grid-column: ${dayIndex + 2};  grid-row: ${startRow} / span ${rowSpan}`,
          data: entry.data,
        });
      }
    });
  });
  console.log(eventsFlat);

  return { eventsFlat, beyondBudgetDays };
};
