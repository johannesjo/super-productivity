import {
  selectDoneOn,
  selectOpenTasks,
  selectTotalTrackedOn,
  type DomainCommand,
  type DomainState,
  type ISODate,
} from '@noura/domain';
import { addDays, parseDate, toDateStr } from '@noura/domain';

/** `today` advanced by one ISO day (UTC-safe). */
export const nextDay = (today: ISODate): ISODate =>
  toDateStr(addDays(parseDate(today), 1));

/**
 * Finish-day summary: the daily history entry recording what the day produced.
 * Returns the single `history/record` command that makes the day durable.
 * Deterministic against `state` and `today`.
 */
export const buildFinishDayCommand = (
  state: DomainState,
  today: ISODate,
): DomainCommand[] => {
  const doneToday = selectDoneOn(state, today);
  const totalTimeSpent = selectTotalTrackedOn(state, today);
  const totalTimeEstimate = doneToday.reduce((total, task) => total + task.estimateMs, 0);
  return [
    {
      type: 'history/record',
      payload: {
        entry: {
          id: `day-${today}`,
          date: today,
          totalTimeSpent,
          totalTimeEstimate,
          tasksDone: doneToday.length,
          resets: 0,
          createdAt: Date.now(),
        },
      },
    },
  ];
};

/**
 * Plan-tomorrow strategy: open, overdue, non-repeating tasks are carried
 * forward to `tomorrow` so the next day starts with a plan. Returns the
 * `task/update` batch (the caller decides when to apply it).
 */
export const buildPlanCommands = (
  state: DomainState,
  today: ISODate,
): DomainCommand[] => {
  const tomorrow = nextDay(today);
  return selectOpenTasks(state)
    .filter(
      (task) => task.dueDay !== undefined && task.dueDay < today && !task.repeatCfgId,
    )
    .map((task): DomainCommand => ({
      type: 'task/update',
      payload: { id: task.id, patch: { dueDay: tomorrow } },
    }));
};

/**
 * Morning review: surfaces the tasks that still need attention today — open
 * tasks due today plus overdue ones that have not been replanned yet. Pure
 * projection, no commands.
 */
export const morningReview = (state: DomainState, today: ISODate) => {
  const overdue = selectOpenTasks(state).filter(
    (task) => task.dueDay !== undefined && task.dueDay < today,
  );
  const dueToday = selectOpenTasks(state).filter((task) => task.dueDay === today);
  return { overdue, dueToday, count: overdue.length + dueToday.length };
};
