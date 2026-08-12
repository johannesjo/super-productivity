import { expandRepeatConfig, selectTasksByProject, } from '@noura/domain';
export const weekDays = (weekStart) => {
    const start = new Date(`${weekStart}T00:00:00Z`).getTime();
    return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(start + index * 86_400_000);
        return day.toISOString().slice(0, 10);
    });
};
export const selectWeekBuckets = (state, weekStart) => weekDays(weekStart).map((date) => ({
    date,
    tasks: Object.values(state.tasks)
        .filter((task) => task.status === 'open' && task.dueDay === date)
        .sort((a, b) => b.priority - a.priority || (a.title < b.title ? -1 : 1)),
}));
/** Recurrence-aware occurrences of repeating tasks inside [start, end]. */
export const scheduleOccurrences = (state, start, end) => {
    const occurrences = [];
    for (const task of Object.values(state.tasks)) {
        if (task.status !== 'open' || !task.repeatCfgId)
            continue;
        const cfg = state.taskRepeatCfgs[task.repeatCfgId];
        if (!cfg)
            continue;
        for (const date of expandRepeatConfig(cfg, start, end).dates) {
            occurrences.push({ task, date });
        }
    }
    return occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.task.title.localeCompare(b.task.title));
};
export const projectTaskCount = (state, projectId) => selectTasksByProject(state, projectId).length;
