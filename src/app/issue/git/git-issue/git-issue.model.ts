// Mapped Data Types
// -----------------
import {
  GitIssueOriginalReduced,
  GitOriginalComment,
  GitOriginalComponent,
  GitOriginalStatus
} from '../git-api-responses';

export type GitAuthor = Readonly<{
  id: string;
  name: string;
  key: string;
  accountId: string;
  emailAddress: string;
  avatarUrl: string;
  displayName: string;
  active: boolean;
  timeZone: string;
}>;

export type GitAttachment = Readonly<{
  id: string;
  filename: string;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}>;

export type GitComment = Readonly<{
  id: string;
  author: GitAuthor;
  body: string;
  updateAuthor: GitAuthor;
  created: string;
  update: string;
  jsdPublic: boolean;
}>;

export type GitChangelogEntry = Readonly<{

}>;


export interface GitIssueReduced extends GitIssueOriginalReduced {
  // new properties
  readonly url: string;
  readonly comments: GitOriginalComment[];
}

export type GitIssue = Readonly<{
  // copied data
  key: string;
  id: string;
  summary: string;
  components: GitOriginalComponent[];
  timeestimate: number;
  timespent: number;
  description: string | null;

  updated: string;
  status: GitOriginalStatus;

  // mapped data
  attachments: GitAttachment[];
  assignee: GitAuthor;
  changelog?: GitChangelogEntry;

  // new properties
  url: string;
  comments: GitComment[];
  wasUpdated?: boolean;
}>;

