const isoTime = (ms) => new Date(ms).toISOString();
export const buildWorklogRows = (state) => {
    const worklogEntries = Object.values(state.worklogs);
    const rawEntries = Object.values(state.trackedEntries);
    const rows = [];
    for (const entry of rawEntries) {
        const { taskId } = entry;
        const task = taskId ? state.tasks[taskId] : undefined;
        rows.push({
            id: entry.id,
            date: entry.date,
            taskTitle: task?.title ?? '(untracked)',
            projectTitle: task ? (state.projects[task.projectId]?.title ?? '') : '',
            startedAt: isoTime(entry.startedAt),
            endedAt: entry.endedAt ? isoTime(entry.endedAt) : '',
            durationMs: entry.durationMs,
        });
    }
    for (const entry of worklogEntries) {
        if (rawEntries.some((raw) => raw.id === entry.id))
            continue;
        const task = entry.taskId ? state.tasks[entry.taskId] : undefined;
        rows.push({
            id: entry.id,
            date: entry.date,
            taskTitle: task?.title ?? '(untracked)',
            projectTitle: task ? (state.projects[task.projectId]?.title ?? '') : '',
            startedAt: isoTime(entry.started),
            endedAt: isoTime(entry.ended),
            durationMs: entry.duration,
        });
    }
    return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') ||
        Date.parse(b.startedAt) - Date.parse(a.startedAt));
};
const csvCell = (value) => {
    if (/[",\n]/.test(value))
        return `"${value.replace(/"/g, '""')}"`;
    return value;
};
/** Comma-separated timesheet export (LF line endings, header row). */
export const worklogToCsv = (rows) => {
    const header = ['date', 'task', 'project', 'started_utc', 'ended_utc', 'duration_ms'];
    const lines = [
        header.map(csvCell).join(','),
        ...rows.map((row) => [
            row.date ?? '',
            row.taskTitle,
            row.projectTitle,
            row.startedAt,
            row.endedAt,
            String(row.durationMs),
        ]
            .map(csvCell)
            .join(',')),
    ];
    return lines.join('\n');
};
export const worklogWeekTotal = (rows) => rows.reduce((total, row) => total + row.durationMs, 0);
export const recentHistory = (state, days = 14) => {
    const byDate = new Map();
    for (const entry of Object.values(state.history)) {
        byDate.set(entry.date, {
            date: entry.date,
            tasksDone: entry.tasksDone,
            totalTimeSpent: entry.totalTimeSpent,
        });
    }
    const result = [];
    const today = new Date();
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
        const iso = date.toISOString().slice(0, 10);
        result.push(byDate.get(iso) ?? { date: iso, tasksDone: 0, totalTimeSpent: 0 });
    }
    return result;
};
