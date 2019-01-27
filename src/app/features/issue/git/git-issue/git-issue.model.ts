import {
  GitOriginalComment,
  GitOriginalLabel,
  GitOriginalMileStone,
  GitOriginalPullRequest,
  GitOriginalState,
  GitOriginalUser
} from '../git-api-responses';

export type GitState = GitOriginalState;
export type GitUser = GitOriginalUser;
export type GitLabel = GitOriginalLabel;
export type GitMileStone = GitOriginalMileStone;
export type GitPullRequest = GitOriginalPullRequest;
export type GitComment = GitOriginalComment;


export type GitIssue = Readonly<{
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
  apiUrl: string;
  _id: number;

  // transformed
  comments?: GitComment[];
  url: string;
  // NOTE: we use the issue number as id as well, as it there is not much to be done with the id with the api
  id: number;

  // removed
  // node_id: string;
  // assignees: GitOriginalUser[];
  // repository: GitOriginalRepository;
}>;

