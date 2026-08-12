export const selectTask = (state, id) => state.tasks[id];
export const selectOrderedTasks = (state) => state.taskOrder
    .map((id) => state.tasks[id])
    .filter((task) => Boolean(task));
export const selectTasksByStatus = (state, status) => selectOrderedTasks(state).filter((task) => task.status === status);
export const selectOpenTasks = (state) => selectTasksByStatus(state, 'open');
export const selectSubtasks = (state, parentId) => state.tasks[parentId]
    ? state.tasks[parentId].subtaskIds
        .map((id) => state.tasks[id])
        .filter((task) => Boolean(task))
    : [];
export const selectDescendants = (state, id) => {
    const result = [];
    const visit = (parentId) => {
        for (const child of selectSubtasks(state, parentId)) {
            result.push(child);
            visit(child.id);
        }
    };
    visit(id);
    return result;
};
export const selectTasksByProject = (state, projectId) => selectOpenTasks(state).filter((task) => task.projectId === projectId);
export const selectTasksByTag = (state, tagId) => selectOpenTasks(state).filter((task) => task.tagIds.includes(tagId));
export const selectOverdueTasks = (state, today) => selectOpenTasks(state).filter((task) => task.dueDay !== undefined && task.dueDay < today);
export const selectDueOn = (state, day) => selectOpenTasks(state).filter((task) => task.dueDay === day);
export const selectTasksDueBetween = (state, fromDay, toDay) => selectOpenTasks(state).filter((task) => task.dueDay !== undefined && task.dueDay >= fromDay && task.dueDay <= toDay);
export const selectDoneOn = (state, day) => selectTasksByStatus(state, 'done').filter((task) => task.doneOn !== undefined &&
    new Date(task.doneOn).toISOString().slice(0, 10) === day);
export const selectPriorityTasks = (state, minimum) => selectOpenTasks(state).filter((task) => task.priority >= minimum);
export const selectTasksWithReminder = (state) => selectOpenTasks(state).filter((task) => task.reminderAt !== undefined);
export const selectWorklogForTask = (state, taskId) => Object.values(state.worklogs)
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => a.started - b.started);
export const selectTrackedEntriesForTask = (state, taskId) => Object.values(state.trackedEntries)
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => a.startedAt - b.startedAt);
export const selectTotalTrackedOn = (state, day) => Object.values(state.trackedEntries).reduce((total, entry) => {
    if (entry.date === day)
        return total + entry.durationMs;
    const startedDay = new Date(entry.startedAt).toISOString().slice(0, 10);
    return startedDay === day ? total + entry.durationMs : total;
}, 0);
export const selectHistoryForDay = (state, day) => Object.values(state.history).find((entry) => entry.date === day);
const matchesCriteria = (task, criteria) => {
    const text = `${task.title} ${task.notes}`.toLowerCase();
    switch (criteria.type) {
        case 'DUE':
            return task.dueDay !== undefined;
        case 'PRIORITY':
            return task.priority >= Number(criteria.value);
        case 'PROJECT':
            return task.projectId === criteria.value;
        case 'TAG':
            return task.tagIds.includes(criteria.value);
        case 'TIME_ESTIMATE':
            return task.estimateMs >= Number(criteria.value);
        case 'TEXT':
            return text.includes(criteria.value.toLowerCase());
        case 'IS_DONE':
            return task.status === 'done';
    }
};
export const selectSmartListTasks = (state, list) => {
    const config = list.listConfig;
    return selectOrderedTasks(state).filter((task) => {
        if (!config.isShowCompletedTasks && task.status === 'done')
            return false;
        return config.filterCriteria.every((criteria) => matchesCriteria(task, criteria));
    });
};
export const selectArchivedTasks = (state) => selectTasksByStatus(state, 'archived');
export const selectTodayBucket = (state, today) => selectDueOn(state, today);
export const selectUpcomingBucket = (state, today, horizon) => selectTasksDueBetween(state, today, horizon);
export const selectCounterByType = (state, type) => Object.values(state.counters).filter((counter) => counter.counterType === type);
