import {
  OpenProjectOriginalComment,
  OpenProjectOriginalLabel,
  OpenProjectOriginalMileStone,
  OpenProjectOriginalPullRequest,
  OpenProjectOriginalState,
  OpenProjectOriginalUser,
} from '../open-project-api-responses';

export type OpenProjectState = OpenProjectOriginalState;
export type OpenProjectUser = OpenProjectOriginalUser;
export type OpenProjectLabel = OpenProjectOriginalLabel;
export type OpenProjectMileStone = OpenProjectOriginalMileStone;
export type OpenProjectPullRequest = OpenProjectOriginalPullRequest;
export type OpenProjectComment = OpenProjectOriginalComment;

export type OpenProjectIssueReduced = Readonly<{
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  // eslint-disable-next-line id-blacklist
  number: number;
  state: OpenProjectState;
  title: string;
  body: string;
  user: OpenProjectUser;
  labels: OpenProjectLabel[];
  assignee: OpenProjectUser;
  milestone: OpenProjectMileStone;
  locked: boolean;
  active_lock_reason: string;
  pull_request: OpenProjectPullRequest;
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
  // assignees: OpenProjectOriginalUser[];
  // repository: OpenProjectOriginalRepository;
}>;

export type OpenProjectIssue = OpenProjectIssueReduced &
  Readonly<{
    comments: OpenProjectComment[];
  }>;
