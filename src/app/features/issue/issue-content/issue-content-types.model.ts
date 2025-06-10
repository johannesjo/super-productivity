import { IssueProviderKey } from '../issue.model';

export enum IssueFieldType {
  TEXT = 'text',
  LINK = 'link',
  CHIPS = 'chips',
  MARKDOWN = 'markdown',
  CUSTOM = 'custom',
}

export interface IssueFieldConfig {
  label: string;
  field: string;
  type: IssueFieldType;
  getValue?: (issue: any) => any;
  getLink?: (issue: any) => string;
  isVisible?: (issue: any) => boolean;
  customTemplate?: string;
}

export interface IssueCommentConfig {
  field: string;
  authorField: string;
  bodyField: string;
  createdField: string;
  avatarField?: string;
  sortField: string;
}

export interface IssueContentConfig {
  issueType: IssueProviderKey;
  fields: IssueFieldConfig[];
  comments?: IssueCommentConfig;
  getIssueUrl?: (issue: any) => string;
  hasCollapsingComments?: boolean;
}
