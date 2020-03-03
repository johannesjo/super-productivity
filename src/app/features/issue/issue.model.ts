import {JiraIssue} from './providers/jira/jira-issue/jira-issue.model';
import {JiraCfg} from './providers/jira/jira.model';
import {GithubCfg} from './providers/github/github.model';
import {GithubIssue} from './providers/github/github-issue/github-issue.model';


export type IssueProviderKey = 'JIRA' | 'GITHUB';
export type IssueIntegrationCfg = JiraCfg | GithubCfg;
export type IssueLocalState = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GITHUB?: GithubCfg;
}

// TODO remove
export interface IssueStateMap {
  JIRA: null;
}
// TODO remove
export type IssueState = null;

export type IssueData = JiraIssue | GithubIssue;

export interface SearchResultItem {
  title: string;
  issueType: IssueProviderKey;
  issueData: IssueData;
  titleHighlighted?: string;
}
