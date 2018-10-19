import { Dictionary } from '@ngrx/entity';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';

export interface IssueIntegrationCfg {
  isEnabled: boolean;
  host: string;
  userName: string;
  password?: string;
  token?: string;
}

export type IssueType = 'JIRA' | 'GIT';

export interface IssueEntityMap {
  JIRA: Dictionary<JiraIssue>;
}