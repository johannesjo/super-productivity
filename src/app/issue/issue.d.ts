import { Dictionary } from '@ngrx/entity';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { JiraCfg } from './jira/jira';

// TODO add others
export type IssueIntegrationCfg = Readonly<JiraCfg>;

export type IssueProviderKey = 'JIRA' | 'GIT';

export interface IssueEntityMap {
  JIRA: Dictionary<JiraIssue>;
}
