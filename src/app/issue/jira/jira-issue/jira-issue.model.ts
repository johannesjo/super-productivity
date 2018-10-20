export type JiraOriginalComponent = Readonly<{
  self: string;
  id: string;
  summary: string;
  name: string;
  description: string;
}>;

export type JiraOriginalAvatarUrls = Readonly<{
  '16x16': string;
  '24x24': string;
  '32x32': string;
  '48x48': string;
}>;


export type JiraOriginalAuthor = Readonly<{
  self: string;
  id: string;
  name: string;
  key: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: JiraOriginalAvatarUrls;
  displayName: string;
  active: boolean;
  timeZone: string;
}>;


export type JiraOriginalAttachment = Readonly<{
  self: string;
  id: string;
  filename: string;
  author: JiraOriginalAuthor;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}>;

export type JiraOriginalComment = Readonly<{
  self: string;
  id: string;
  author: JiraOriginalAuthor;
  body: string;
  updateAuthor: JiraOriginalAuthor;
  created: string;
  update: string;
  jsdPublic: boolean;
}>;

export type JiraOriginalCategory = Readonly<{
  self: string;
  id: string;
  key: string;
  colorName: string;
  name: string;
}>;

export type JiraOriginalStatus = Readonly<{
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  statusCategory: JiraOriginalCategory;
}>;

export type JiraOriginalFields = Readonly<{
  summary: string;
  components: JiraOriginalComponent[];
  attachment: JiraOriginalAttachment[];
  timeestimate: number;
  timespent: number;
  description: string | null;
  comment?: {
    comments: JiraOriginalComment[],
    maxResults: number,
    total: number,
    startAt: number
  }
  assignee: JiraOriginalAuthor;
  updated: string;
  status: JiraOriginalStatus;
}>;


export type JiraIssueOriginalReduced = Readonly<{
  key: string;
  id: string;
  expand: string;
  self: string;
}>;

export type JiraIssueOriginal = Readonly<{
  key: string;
  id: string;
  expand: string;
  self: string;
  fields: JiraOriginalFields;
}>;


// Mapped Data Types
// -----------------
export type JiraAuthor = Readonly<{
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


export type JiraAttachment = Readonly<{
  id: string;
  filename: string;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}>;

export type JiraComment = Readonly<{
  id: string;
  author: JiraAuthor;
  body: string;
  updateAuthor: JiraAuthor;
  created: string;
  update: string;
  jsdPublic: boolean;
}>;


export interface JiraIssueReduced extends JiraIssueOriginalReduced {
  // new properties
  readonly url: string;
  readonly comments: JiraOriginalComment[];
}

export type JiraIssue = Readonly<{
  // copied data
  key: string;
  id: string;
  summary: string;
  components: JiraOriginalComponent[];
  timeestimate: number;
  timespent: number;
  description: string | null;

  updated: string;
  status: JiraOriginalStatus;

  // mapped data
  attachments: JiraAttachment[];
  assignee: JiraAuthor;

  // new properties
  url: string;
  comments: JiraComment[];
}>;

