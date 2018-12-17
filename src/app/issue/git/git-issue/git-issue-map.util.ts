import { GitIssue } from './git-issue.model';
import { GitOriginalIssue } from '../git-api-responses';

export const mapGitIssue = (issue: GitOriginalIssue): GitIssue => {
  return {
    id: issue.id,
    url: issue.url,
    repository_url: issue.repository_url,
    labels_url: issue.labels_url,
    comments_url: issue.comments_url,
    events_url: issue.events_url,
    html_url: issue.html_url,
    number: issue.number,
    state: issue.state,
    title: issue.title,
    body: issue.body,
    user: issue.user,
    labels: issue.labels,
    assignee: issue.assignee,
    milestone: issue.milestone,
    locked: issue.locked,
    active_lock_reason: issue.active_lock_reason,
    comments: issue.comments,
    pull_request: issue.pull_request,
    closed_at: issue.closed_at,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    wasUpdated: false,
  };
};
