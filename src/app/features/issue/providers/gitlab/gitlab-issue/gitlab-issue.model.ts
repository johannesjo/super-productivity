import {
  GitlabOriginalComment,
  GitlabOriginalIssueState,
  GitlabOriginalMilestone,
  GitlabOriginalUser,
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
  // eslint-disable-next-line id-blacklist
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
  comments: GitlabComment[];
  url: string;
  // NOTE: we use the issue number as id as well, as it there is not much to be done with the id with the api
  id: number;

  // according to the docs: "Users on GitLab Starter, Bronze, or higher will also see the weight parameter"
  weight?: number;
}>;
