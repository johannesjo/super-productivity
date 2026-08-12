import type { DomainState, Worklog } from '@noura/domain';

// Builds provider worklog entries from the local domain so a compiled-in
// adapter can push tracked time back to an issue tracker (Phase 7 "worklog
// export"). Only worklogs linked to a task that carries an issue are exported.

export interface IssueWorklogEntry {
  issueKey: string;
  author: string;
  startedAt: string;
  timeSpentSeconds: number;
  comment?: string;
}

export const buildIssueWorklogs = (
  state: DomainState,
  providerId: string,
): IssueWorklogEntry[] => {
  const entries: IssueWorklogEntry[] = [];
  for (const worklog of Object.values(state.worklogs) as Worklog[]) {
    if (!worklog.taskId) continue;
    const task = state.tasks[worklog.taskId];
    if (!task?.issue || task.issue.providerId !== providerId) continue;
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

export const worklogToJiraPayload = (entry: IssueWorklogEntry): unknown => ({
  timeSpentSeconds: entry.timeSpentSeconds,
  started: entry.startedAt,
  comment: entry.comment,
});
