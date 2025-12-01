import { ScheduleDay, ScheduleEvent } from '../schedule.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { SVEType } from '../schedule.const';
import { TaskWithPlannedForDayIndication } from '../../tasks/task.model';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';

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
        dayOfMonth: undefined,
        data: taskPlannedForDay,
        type: SVEType.TaskPlannedForDay,
        style: `height: ${rowSpan * 8}px`,
        timeLeftInHours,
        isCloseToOthers: false,
        isCloseToOthersFirst: false,
        startHours: 0,
      };
    });

    day.entries.forEach((entry, entryIndex) => {
      if (entry.type !== SVEType.WorkdayEnd && entry.type !== SVEType.WorkdayStart) {
        const start = new Date(entry.start);
        const startHour = start.getHours();
        const startMinute = start.getMinutes();
        // eslint-disable-next-line no-mixed-operators
        const hoursToday = startHour + startMinute / 60;

        // NOTE: +1 cause grids start on 1
        const startRow = Math.round(hoursToday * FH) + 1;
        const timeLeft = entry.duration;

        const entryBefore = day.entries[entryIndex - 1];
        const diff = entry.start - entryBefore?.start;
        // const isCloseToOthers = entryBefore && diff <= 5 * 60 * 1000 && diff >= 0;
        const isCloseToOthers = !!entryBefore && diff === 0;
        if (
          isCloseToOthers &&
          eventsFlat[eventsFlat.length - 1] &&
          !eventsFlat[eventsFlat.length - 1].isCloseToOthers
        ) {
          eventsFlat[eventsFlat.length - 1].isCloseToOthers = true;
          eventsFlat[eventsFlat.length - 1].isCloseToOthersFirst = true;
        }

        // NOTE since we only use getMinutes we also need to floor the minutes for timeLeftInHours
        const timeLeftInHours = Math.floor(timeLeft / 1000 / 60) / 60;
        const rowSpan = Math.max(1, Math.round(timeLeftInHours * FH));

        eventsFlat.push({
          dayOfMonth:
            ((entry.data as TaskWithPlannedForDayIndication)?.plannedForDay &&
              dateStrToUtcDate(
                (entry.data as TaskWithPlannedForDayIndication)?.plannedForDay,
              ).getDate()) ||
            undefined,
          id: entry.id,
          type: entry.type as SVEType,
          startHours: hoursToday,
          timeLeftInHours,
          isCloseToOthers,
          isCloseToOthersFirst: false,
          // title: entry.data.title,
          style: `grid-column: ${dayIndex + 2};  grid-row: ${startRow} / span ${rowSpan}`,
          data: entry.data,
        });
      }
    });
  });

  return { eventsFlat, beyondBudgetDays };
};
