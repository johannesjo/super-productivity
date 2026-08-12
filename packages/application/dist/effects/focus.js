import { selectDoneOn, } from '@noura/domain';
/**
 * Completion → history: when a task is toggled done, refresh the day summary
 * so the History view reflects the new completion as part of the same effect.
 * Deterministic against the state and the supplied logical completion time.
 */
export const buildCompletionHistoryCommand = (state, task, at) => {
    const day = new Date(at).toISOString().slice(0, 10);
    const doneToday = selectDoneOn(state, day).filter((candidate) => candidate.id !== task.id);
    if (task.status === 'done')
        doneToday.push(task);
    const totalTimeEstimate = doneToday.reduce((total, current) => total + current.estimateMs, 0);
    return [
        {
            type: 'history/record',
            payload: {
                entry: {
                    id: `day-${day}`,
                    date: day,
                    totalTimeSpent: 0,
                    totalTimeEstimate,
                    tasksDone: doneToday.length,
                    resets: 0,
                    createdAt: at,
                },
            },
        },
    ];
};
/**
 * Focus-day summary → worklog: a finished tracked entry becomes a durable
 * worklog row. Returns zero commands for entries that are still running.
 */
export const buildWorklogCommand = (entry) => {
    if (entry.endedAt === undefined)
        return [];
    return [{ type: 'worklog/from-entry', payload: { entry } }];
};
/**
 * Focus-day summary: aggregates a day's tracked entries into the worklog
 * projection used by the timesheet view. Pure, no commands.
 */
export const focusDaySummary = (state, day) => {
    const entries = Object.values(state.trackedEntries).filter((entry) => entry.date === day || new Date(entry.startedAt).toISOString().slice(0, 10) === day);
    const totalMs = entries.reduce((total, entry) => total + entry.durationMs, 0);
    return { entries, totalMs, count: entries.length };
};
