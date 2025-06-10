import { IssueProviderKey, IssueData } from '../issue.model';

export enum IssueFieldType {
  TEXT = 'text',
  LINK = 'link',
  CHIPS = 'chips',
  MARKDOWN = 'markdown',
  CUSTOM = 'custom',
}

export interface IssueFieldConfig<T = IssueData> {
  label: string;
  field: string;
  type: IssueFieldType;
  getValue?: (issue: T) => any;
  getLink?: (issue: T) => string;
  isVisible?: (issue: T) => boolean;
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

export interface IssueContentConfig<T = IssueData> {
  issueType: IssueProviderKey;
  fields: IssueFieldConfig<T>[];
  comments?: IssueCommentConfig;
  getIssueUrl?: (issue: T) => string;
  hasCollapsingComments?: boolean;
}
