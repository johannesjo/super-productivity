import { IssueProviderKey } from '../issue.model';
import { JIRA_ISSUE_CONTENT_CONFIG } from '../providers/jira/jira.const';
import { GITHUB_ISSUE_CONTENT_CONFIG } from '../providers/github/github.const';
import { GITLAB_ISSUE_CONTENT_CONFIG } from '../providers/gitlab/gitlab.const';
import { CALDAV_ISSUE_CONTENT_CONFIG } from '../providers/caldav/caldav.const';
import { GITEA_ISSUE_CONTENT_CONFIG } from '../providers/gitea/gitea.const';
import { REDMINE_ISSUE_CONTENT_CONFIG } from '../providers/redmine/redmine.const';
import { OPEN_PROJECT_ISSUE_CONTENT_CONFIG } from '../providers/open-project/open-project.const';

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

export const ISSUE_CONTENT_CONFIGS: Record<IssueProviderKey, IssueContentConfig> = {
  GITHUB: GITHUB_ISSUE_CONTENT_CONFIG,
  GITLAB: GITLAB_ISSUE_CONTENT_CONFIG,
  JIRA: JIRA_ISSUE_CONTENT_CONFIG,
  CALDAV: CALDAV_ISSUE_CONTENT_CONFIG,
  GITEA: GITEA_ISSUE_CONTENT_CONFIG,
  REDMINE: REDMINE_ISSUE_CONTENT_CONFIG,
  OPEN_PROJECT: OPEN_PROJECT_ISSUE_CONTENT_CONFIG,
};
