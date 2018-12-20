import { GitOriginalLabel, GitOriginalMileStone, GitOriginalPullRequest, GitOriginalState, GitOriginalUser } from '../git-api-responses';

export type GitState = GitOriginalState;
export type GitUser = GitOriginalUser;
export type GitLabel = GitOriginalLabel;
export type GitMileStone = GitOriginalMileStone;
export type GitPullRequest = GitOriginalPullRequest;

export type GitIssue = Readonly<{
  id: number;
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  number: number;
  state: GitState;
  title: string;
  body: string;
  user: GitUser;
  labels: GitLabel[];
  assignee: GitUser;
  milestone: GitMileStone;
  locked: boolean;
  active_lock_reason: string;
  pull_request: GitPullRequest;
  closed_at: string;
  created_at: string;
  updated_at: string;

  // added
  wasUpdated: boolean;
  commentsNr: number;

  // transformed
  comments?: any[];

  // removed
  // node_id: string;
  // assignees: GitOriginalUser[];
  // repository: GitOriginalRepository;
}>;

