import { Signal, untracked } from '@angular/core';
import { getDbDateStr, isValidDBDateStr } from '../../../util/get-db-date-str';
import { Task } from '../task.model';

export type ScheduledDateColor = 'overdue' | '';

/** Only overdue schedules get a color; uses the logical day for timed tasks. */
export const getScheduledDateColor = (
  task: Pick<Task, 'dueDay' | 'dueWithTime' | 'isDone'>,
  today: string,
  startOfNextDayDiffMs: number,
  now: number,
): ScheduledDateColor => {
  if (task.isDone) return '';
  const dueDate = task.dueWithTime
    ? getDbDateStr(new Date(task.dueWithTime - startOfNextDayDiffMs))
    : task.dueDay;
  if (!dueDate || !isValidDBDateStr(dueDate)) return '';
  if (dueDate < today || (task.dueWithTime && task.dueWithTime <= now)) {
    return 'overdue';
  }
  return '';
};

/**
 * Reads the display clock for a timed task's color, but depends on it only
 * until the task is due: from then on the task stays overdue, so its color
 * need not re-run every second. Thousands of overdue rows otherwise do.
 */
export const readClockUntilDue = (clock: Signal<number>, dueWithTime: number): number => {
  const now = untracked(clock);
  return dueWithTime > now ? clock() : now;
};
