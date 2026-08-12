import type { Task, TaskPriority } from '@noura/domain';

// Provider-agnostic DTOs and transforms (Phase 7). Clients normalize provider
// payloads into these shapes; the transforms map them onto Noura's domain.

export interface RemoteIssue {
  id: string;
  key: string;
  title: string;
  description: string;
  state: string;
  priority: number;
  assignee?: string;
  reporter?: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface RemoteWorklog {
  id: string;
  author: string;
  startedAt: string;
  timeSpentSeconds: number;
  comment?: string;
}

/** Normalized seed for creating a Noura task from a remote issue. */
export interface TaskSeed {
  title: string;
  notes: string;
  priority: TaskPriority;
  issue: { providerId: string; issueId: string; key: string; url: string };
}

export const normalizePriority = (value: unknown): TaskPriority => {
  const number = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(number))
    return Math.min(3, Math.max(0, Math.round(number))) as TaskPriority;
  const text = String(value ?? '').toLowerCase();
  if (text.includes('high')) return 3;
  if (text.includes('medium')) return 2;
  if (text.includes('low')) return 1;
  return 0;
};

export const issueToTaskSeed = (
  issue: RemoteIssue,
  providerId: string,
  projectId?: string,
): TaskSeed => ({
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
export const importBacklogSeeds = (
  issues: RemoteIssue[],
  providerId: string,
  projectId?: string,
): TaskSeed[] => issues.map((issue) => issueToTaskSeed(issue, providerId, projectId));

export const remoteCommentText = (comments: RemoteComment[]): string =>
  comments
    .map((comment) => `**${comment.author}** · ${comment.createdAt}\n\n${comment.body}`)
    .join('\n\n---\n\n');

export const taskToIssueSummary = (task: Task): string =>
  `${task.title}\n\n${task.notes || ''}`.trim();
