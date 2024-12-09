export type GitlabOriginalIssueState = 'open' | 'closed' | 'all';
export type GitlabOriginalMilestoneState = 'active' | 'closed';
export type GitlabOriginalUserState = 'active' | 'blocked';

export type GitlabOriginalMilestone = Readonly<{
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  start_date: string;
  due_date: string;
  state: GitlabOriginalMilestoneState;
  created_at: string;
  updated_at: string;
}>;

export type GitlabOriginalUser = Readonly<{
  id: number;
  username: string;
  name: string;
  state: GitlabOriginalUserState;
  avatar_url: string;
  web_url: string;
}>;

export type GitlabOriginalIssue = Readonly<{
  // unique identifier used in GitLab db and is only usable for admins in many cases
  id: number;
  // unique only on a project level
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: GitlabOriginalIssueState;
  weight: number;
  created_at: string;
  updated_at: string;
  closed_at: string;
  closed_by: string;
  labels: string[];
  milestone: unknown;
  assignees: GitlabOriginalUser[];
  author: GitlabOriginalUser;
  assignee: GitlabOriginalUser;
  user_notes_count: number;
  merge_requests_count: number;
  upvotes: number;
  downvotes: number;
  due_date: string;
  confidential: boolean;
  discussion_locked: boolean;
  web_url: string;
  time_stats: {
    time_estimate: number;
    total_time_spent: number;
    human_time_estimate: string;
    human_total_time_spent: string;
  };
  task_completion_status: {
    count: number;
    completed_count: number;
  };
  has_tasks: boolean;
  task_status: string;
  _links: {
    self: string;
    notes: string;
    award_emoji: string;
    project: string;
  };
  references: {
    short: string;
    relative: string;
    full: string;
  };
  moved_to_id: number;
}>;

export type GitlabOriginalComment = Readonly<{
  id: number;
  body: string;
  attachment: string;
  author: GitlabOriginalUser;
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_id: number;
  noteable_type: string;
  noteable_iid: number;
  resolvable: boolean;
}>;
