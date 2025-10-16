/**
 * trello issue model
 * reference: https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-group-cards
 */
export interface TrelloLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
}

export interface TrelloAttachmentPreview {
  id: string;
  url: string;
  height: number | null;
  width: number | null;
  scaled: boolean;
  bytes: number | null;
}

export interface TrelloAttachment {
  id: string;
  bytes: number | null;
  date: string;
  edgeColor: string | null;
  idMember: string | null;
  isUpload: boolean;
  mimeType: string | null;
  name: string;
  previews: TrelloAttachmentPreview[];
  url: string;
  pos: number;
}

export type TrelloIssueReduced = Readonly<{
  /** Short link for the card; used as the primary identifier within the app */
  id: string;
  /** Full Trello card id */
  idCard: string;
  /** Numeric short id shown on the board */
  key: string;
  shortLink: string;
  name: string;
  summary: string;
  desc: string | null;
  url: string;
  due: string | null;
  dueComplete: boolean;
  closed: boolean;
  idBoard: string;
  idList: string;
  updated: string;
  labels: TrelloLabel[];
  members: TrelloMember[];
  attachments: TrelloAttachment[];
  storyPoints?: number | null;
}>;

export type TrelloIssue = TrelloIssueReduced;
