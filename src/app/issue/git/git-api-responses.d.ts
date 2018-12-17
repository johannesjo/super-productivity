// Standard API responses
export type GitOriginalComponent = Readonly<{
  self: string;
  id: string;
  summary: string;
  name: string;
  description: string;
}>;

export type GitOriginalAvatarUrls = Readonly<{
  '16x16': string;
  '24x24': string;
  '32x32': string;
  '48x48': string;
}>;


export type GitOriginalAuthor = Readonly<{
  self: string;
  id: string;
  name: string;
  key: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: GitOriginalAvatarUrls;
  displayName: string;
  active: boolean;
  timeZone: string;
}>;


export interface GitOriginalUser extends GitOriginalAuthor {
  expand: string;
  locale: string;
  groups: {
    items: any[];
    size: number;
  };
  applicationRoles: {
    items: any[];
    size: number;
  };
}

export type GitOriginalAttachment = Readonly<{
  self: string;
  id: string;
  filename: string;
  author: GitOriginalAuthor;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}>;

export type GitOriginalComment = Readonly<{
  self: string;
  id: string;
  author: GitOriginalAuthor;
  body: string;
  updateAuthor: GitOriginalAuthor;
  created: string;
  update: string;
  jsdPublic: boolean;
}>;

export type GitOriginalCategory = Readonly<{
  self: string;
  id: string;
  key: string;
  colorName: string;
  name: string;
}>;

export type GitOriginalStatus = Readonly<{
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  statusCategory: GitOriginalCategory;
}>;

export type GitOriginalFields = Readonly<{
  summary: string;
  components: GitOriginalComponent[];
  attachment: GitOriginalAttachment[];
  timeestimate: number;
  timespent: number;
  description: string | null;
  comment?: {
    comments: GitOriginalComment[],
    maxResults: number,
    total: number,
    startAt: number
  }
  assignee: GitOriginalAuthor;
  updated: string;
  status: GitOriginalStatus;
}>;


export type GitIssueOriginalReduced = Readonly<{
  key: string;
  id: string;
  expand: string;
  self: string;
}>;


export type GitOriginalChangelog = Readonly<{
  histories: {
    author: GitOriginalAuthor;
    created: string;
    id: string;
    items: {
      field: string;
      fieldId: string;
      fieldtype: string;
      from: any;
      fromString: string;
      to: any;
      toString: string;
    }[];
  }[];
  maxResults: number;
  startAt: number;
  total: number;
}>;


export type GitIssueOriginal = Readonly<{
  key: string;
  id: string;
  expand: string;
  self: string;
  fields: GitOriginalFields;
  changelog?: GitOriginalChangelog;
}>;
