import { ScheduleEvent } from '../schedule.model';
import { SVEType, FH } from '../schedule.const';
import { TaskCopy } from '../../tasks/task.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

const D_HOURS = 24;

const resolvePlannedDayStr = (
  task: TaskCopy,
  startOfNextDayDiffMs: number,
): string | undefined => {
  if (task.dueWithTime) {
    return getDbDateStr(new Date(task.dueWithTime - startOfNextDayDiffMs));
  }
  return task.dueDay ?? undefined;
};

const resolveDeadlineDayStr = (
  task: TaskCopy,
  startOfNextDayDiffMs: number,
): string | undefined => {
  if (task.deadlineWithTime) {
    return getDbDateStr(new Date(task.deadlineWithTime - startOfNextDayDiffMs));
  }
  return task.deadlineDay ?? undefined;
};

/**
 * Builds one faded "ghost" event per visible day that falls strictly between a
 * task's planned day and its deadline day (both ends already show their own
 * real markers, so they're excluded here).
 */
export const createDeadlineGhostEvents = (
  tasks: TaskCopy[],
  daysToShow: string[],
  startOfNextDayDiffMs: number,
): ScheduleEvent[] => {
  const ghostEvents: ScheduleEvent[] = [];

  for (const task of tasks) {
    if (task.isDone) {
      continue;
    }

    const plannedStr = resolvePlannedDayStr(task, startOfNextDayDiffMs);
    const deadlineStr = resolveDeadlineDayStr(task, startOfNextDayDiffMs);
    if (!plannedStr || !deadlineStr || deadlineStr <= plannedStr) {
      continue;
    }

    daysToShow.forEach((day, dayIndex) => {
      if (day > plannedStr && day < deadlineStr) {
        ghostEvents.push({
          id: `ghost__${task.id}__${day}`,
          type: SVEType.DeadlineGhost,
          data: task,
          style: `grid-column: ${dayIndex + 2}; grid-row: 1 / span ${D_HOURS * FH}`,
          startHours: 0,
          timeLeftInHours: D_HOURS,
          plannedForDay: day,
        });
      }
    });
  }

  return ghostEvents;
};
