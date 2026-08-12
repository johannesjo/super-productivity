export const normalizePriority = (value) => {
    const number = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(number))
        return Math.min(3, Math.max(0, Math.round(number)));
    const text = String(value ?? '').toLowerCase();
    if (text.includes('high'))
        return 3;
    if (text.includes('medium'))
        return 2;
    if (text.includes('low'))
        return 1;
    return 0;
};
export const issueToTaskSeed = (issue, providerId, projectId) => ({
    title: `${issue.key}: ${issue.title}`,
    notes: [
        issue.description?.trim() && issue.description,
        issue.url && `[${issue.key}](${issue.url})`,
        issue.assignee && `Assignee: ${issue.assignee}`,
    ]
        .filter(Boolean)
        .join('\n\n'),
    priority: normalizePriority(issue.priority),
    issue: { providerId, issueId: issue.id, key: issue.key, url: issue.url },
});
/** Marks every produced seed with the owning project when importing a backlog. */
export const importBacklogSeeds = (issues, providerId, projectId) => issues.map((issue) => issueToTaskSeed(issue, providerId, projectId));
export const remoteCommentText = (comments) => comments
    .map((comment) => `**${comment.author}** · ${comment.createdAt}\n\n${comment.body}`)
    .join('\n\n---\n\n');
export const taskToIssueSummary = (task) => `${task.title}\n\n${task.notes || ''}`.trim();
