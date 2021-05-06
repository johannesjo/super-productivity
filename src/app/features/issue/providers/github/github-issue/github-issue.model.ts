import {
  GithubOriginalComment,
  GithubOriginalLabel,
  GithubOriginalMileStone,
  GithubOriginalPullRequest,
  GithubOriginalState,
  GithubOriginalUser,
} from '../github-api-responses';

export type GithubState = GithubOriginalState;
export type GithubUser = GithubOriginalUser;
export type GithubLabel = GithubOriginalLabel;
export type GithubMileStone = GithubOriginalMileStone;
export type GithubPullRequest = GithubOriginalPullRequest;
export type GithubComment = GithubOriginalComment;

export type GithubIssueReduced = Readonly<{
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  // eslint-disable-next-line id-blacklist
  number: number;
  state: GithubState;
  title: string;
  body: string;
  user: GithubUser;
  labels: GithubLabel[];
  assignee: GithubUser;
  milestone: GithubMileStone;
  locked: boolean;
  active_lock_reason: string;
  pull_request: GithubPullRequest;
  closed_at: string;
  created_at: string;
  updated_at: string;

  // added
  commentsNr: number;
  apiUrl: string;
  _id: number;

  // transformed
  url: string;
  // NOTE: we use the issue number as id as well, as it there is not much to be done with the id with the api
  id: number;

  // removed
  // node_id: string;
  // assignees: GithubOriginalUser[];
  // repository: GithubOriginalRepository;
}>;

export type GithubIssue = GithubIssueReduced &
  Readonly<{
    comments: GithubComment[];
  }>;
