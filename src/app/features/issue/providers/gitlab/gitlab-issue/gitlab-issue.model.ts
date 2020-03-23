import {
  GitlabOriginalComment,
  GitlabOriginalIssueState,
  GitlabOriginalUser,
  GitlabOriginalMilestone,
} from '../gitlab-api/gitlab-api-responses';

export type GitlabState = GitlabOriginalIssueState;
export type GitlabUser = GitlabOriginalUser;
export type GitlabComment = GitlabOriginalComment;


export type GitlabIssue = Readonly<{
  // repository_url: string;
  // labels_url: string;
  // comments_url: string;
  // events_url: string;
  html_url: string;
  number: number;
  state: GitlabState;
  title: string;
  body: string;
  user: GitlabUser;
  labels: string[];
  assignee: GitlabUser;
  milestone: GitlabOriginalMilestone;
  // locked: boolean;
  // active_lock_reason: string;
  // pull_request: GitlabPullRequest;
  closed_at: string;
  created_at: string;
  updated_at: string;

  // added
  wasUpdated: boolean;
  commentsNr: number;
  // apiUrl: string;
  _id: number;

  // transformed
  comments?: GitlabComment[];
  url: string;
  // NOTE: we use the issue number as id as well, as it there is not much to be done with the id with the api
  id: number;
}>;
