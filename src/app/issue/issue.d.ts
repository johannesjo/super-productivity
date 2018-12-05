import { Dictionary } from '@ngrx/entity';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { JiraCfg } from './jira/jira';

// TODO add others
export type IssueIntegrationCfg = Readonly<JiraCfg>;
export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GIT?: IssueIntegrationCfg;
}


export type IssueProviderKey = 'JIRA' | 'GIT';

export interface IssueEntityMap {
  JIRA: Dictionary<JiraIssue>;
}

export type IssueData = Readonly<JiraIssue>;
