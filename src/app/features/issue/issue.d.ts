import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { JiraCfg } from './jira/jira';
import { GithubCfg } from './github/github';
import { GithubIssue } from './github/github-issue/github-issue.model';
import { JiraIssueState } from './jira/jira-issue/store/jira-issue.reducer';
import { GithubIssueState } from './github/github-issue/store/github-issue.reducer';


export type IssueProviderKey = 'JIRA' | 'GITHUB';
export type IssueIntegrationCfg = JiraCfg | GithubCfg;
export type IssueLocalState = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GITHUB?: GithubCfg;
}

export interface IssueStateMap {
  JIRA: JiraIssueState;
  GITHUB: GithubIssueState;
}


export type IssueState = JiraIssueState | GithubIssueState;

export type IssueData = JiraIssue | GithubIssue;

export interface SearchResultItem {
  title: string;
  issueType: IssueProviderKey;
  issueData: IssueData;
  titleHighlighted?: string;
}
