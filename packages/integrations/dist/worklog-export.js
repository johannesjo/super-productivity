export const buildIssueWorklogs = (state, providerId) => {
    const entries = [];
    for (const worklog of Object.values(state.worklogs)) {
        if (!worklog.taskId)
            continue;
        const task = state.tasks[worklog.taskId];
        if (!task?.issue || task.issue.providerId !== providerId)
            continue;
        entries.push({
            issueKey: task.issue.key,
            author: 'noura',
            startedAt: new Date(worklog.started).toISOString(),
            timeSpentSeconds: Math.max(1, Math.round(worklog.duration / 1000)),
            comment: worklog.notes || task.issue.key,
        });
    }
    return entries.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
};
export const worklogToJiraPayload = (entry) => ({
    timeSpentSeconds: entry.timeSpentSeconds,
    started: entry.startedAt,
    comment: entry.comment,
});
